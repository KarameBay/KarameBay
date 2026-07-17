import dns from "node:dns/promises";
import net from "net";
import tls from "tls";
import { getBusinessProfile } from "@/lib/business-profile";

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromAddress: string;
};

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
  fromAddress?: string;
};

type SmtpFailure = {
  message: string;
  name?: string;
  code?: string;
  cause?: string;
};

function cleanEnv(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getConfig(): MailConfig | null {
  const GMAIL_SMTP_HOST = cleanEnv(process.env.GMAIL_SMTP_HOST);
  const GMAIL_SMTP_PORT = cleanEnv(process.env.GMAIL_SMTP_PORT);
  const GMAIL_SMTP_SECURE = cleanEnv(process.env.GMAIL_SMTP_SECURE);
  const GMAIL_SMTP_USER = cleanEnv(process.env.GMAIL_SMTP_USER);
  const GMAIL_SMTP_APP_PASSWORD = cleanEnv(process.env.GMAIL_SMTP_APP_PASSWORD);
  const EMAIL_FROM_NAME = cleanEnv(process.env.EMAIL_FROM_NAME);
  const EMAIL_FROM_ADDRESS = cleanEnv(process.env.EMAIL_FROM_ADDRESS);
  if (!GMAIL_SMTP_USER || !GMAIL_SMTP_APP_PASSWORD)
    return null;
  const host = GMAIL_SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(GMAIL_SMTP_PORT || "587");
  if (!Number.isInteger(port) || port < 0 || port >= 65_536) return null;
  const fromAddress = EMAIL_FROM_ADDRESS ?? GMAIL_SMTP_USER;
  return {
    host,
    port,
    secure: GMAIL_SMTP_SECURE === "true",
    user: GMAIL_SMTP_USER,
    password: GMAIL_SMTP_APP_PASSWORD,
    fromName: EMAIL_FROM_NAME ?? "Karame Bay",
    fromAddress,
  };
}

function escapeSubject(subject: string) {
  return subject.replaceAll(/\r?\n/g, " ").trim();
}

function normalizeBody(body: string) {
  return body.replaceAll(/\r\n/g, "\n").replaceAll(/\n/g, "\r\n");
}

function formatHeaders(message: MailMessage, config: MailConfig) {
  const fromName = message.fromName ?? config.fromName;
  const fromAddress = message.fromAddress ?? config.fromAddress;
  const headers = [
    `From: ${fromName} <${fromAddress}>`,
    `To: ${message.to}`,
    `Subject: ${escapeSubject(message.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${normalizeBody(message.text)}`;
}

async function readResponse(
  socket: net.Socket | tls.TLSSocket,
  buffer: { value: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      buffer.value += chunk.toString("utf8");
      const lines = buffer.value.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;
      const lastLine = lines[lines.length - 1];
      if (!/^\d{3}\s/.test(lastLine)) return;
      socket.off("data", onData);
      socket.off("error", onError);
      resolve(lines.join("\n"));
    };
    const onError = (error: Error) => {
      socket.off("data", onData);
      socket.off("error", onError);
      reject(error);
    };
    socket.on("data", onData);
    socket.once("error", onError);
  });
}

async function sendCommand(
  socket: net.Socket | tls.TLSSocket,
  buffer: { value: string },
  command: string,
) {
  socket.write(`${command}\r\n`);
  return readResponse(socket, buffer);
}

function expectSmtp(response: string, expectedCodes: number[], action: string) {
  const lastLine = response.split(/\r?\n/).filter(Boolean).at(-1) ?? "";
  const code = Number(lastLine.slice(0, 3));
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP ${action} failed: ${lastLine || "No response"}`);
  }
}

function describeError(error: unknown): SmtpFailure {
  if (!(error instanceof Error)) {
    return { message: typeof error === "string" ? error : "SMTP delivery failed." };
  }
  const maybeCode =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const cause =
    error.cause instanceof Error
      ? error.cause.message || error.cause.name
      : typeof error.cause === "string"
        ? error.cause
        : undefined;
  return {
    message: error.message || maybeCode || error.name || "SMTP delivery failed.",
    name: error.name,
    code: maybeCode,
    cause,
  };
}

async function connectPlain(host: string, port: number): Promise<net.Socket> {
  const [address] = await dns.resolve4(host);
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: address ?? host, port });
    socket.setTimeout(15_000, () =>
      socket.destroy(new Error("SMTP connection timed out.")),
    );
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function connectSecure(host: string, port: number): Promise<tls.TLSSocket> {
  const [address] = await dns.resolve4(host);
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: address ?? host, port, servername: host });
    socket.setTimeout(15_000, () =>
      socket.destroy(new Error("SMTP TLS connection timed out.")),
    );
    socket.once("secureConnect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function upgradeToTls(
  socket: net.Socket,
  host: string,
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect({
      socket,
      servername: host,
    });
    tlsSocket.once("secureConnect", () => resolve(tlsSocket));
    tlsSocket.once("error", reject);
  });
}

export async function sendSmtpMail(message: MailMessage) {
  const business = await getBusinessProfile();
  message = { ...message, fromName: message.fromName ?? business.businessName };
  const config = getConfig();
  if (!config) {
    return {
      ok: false as const,
      error:
        "Gmail SMTP is not configured. Add GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD to .env.",
    };
  }

  const buffer = { value: "" };
  let socket: net.Socket | tls.TLSSocket | null = null;

  try {
    if (config.secure) {
      socket = await connectSecure(config.host, config.port);
      expectSmtp(await readResponse(socket, buffer), [220], "greeting");
    } else {
      socket = await connectPlain(config.host, config.port);
      expectSmtp(await readResponse(socket, buffer), [220], "greeting");
      expectSmtp(
        await sendCommand(socket, buffer, `EHLO ${config.host}`),
        [250],
        "EHLO",
      );
      expectSmtp(await sendCommand(socket, buffer, "STARTTLS"), [220], "STARTTLS");
      const tlsSocket = await upgradeToTls(socket, config.host);
      socket = tlsSocket;
      buffer.value = "";
    }

    expectSmtp(
      await sendCommand(socket, buffer, `EHLO ${config.host}`),
      [250],
      "EHLO",
    );
    expectSmtp(await sendCommand(socket, buffer, "AUTH LOGIN"), [334], "AUTH");
    expectSmtp(
      await sendCommand(socket, buffer, Buffer.from(config.user).toString("base64")),
      [334],
      "username",
    );
    expectSmtp(
      await sendCommand(
        socket,
        buffer,
        Buffer.from(config.password).toString("base64"),
      ),
      [235],
      "password",
    );
    expectSmtp(
      await sendCommand(
        socket,
        buffer,
        `MAIL FROM:<${message.fromAddress ?? config.fromAddress}>`,
      ),
      [250],
      "sender",
    );
    expectSmtp(
      await sendCommand(socket, buffer, `RCPT TO:<${message.to}>`),
      [250, 251],
      "recipient",
    );
    expectSmtp(await sendCommand(socket, buffer, "DATA"), [354], "DATA");
    socket.write(`${formatHeaders(message, config)}\r\n.\r\n`);
    expectSmtp(await readResponse(socket, buffer), [250], "message delivery");
    await sendCommand(socket, buffer, "QUIT").catch(() => null);
    socket.end();
    return { ok: true as const };
  } catch (error) {
    const failure = describeError(error);
    return {
      ok: false as const,
      error: failure.message,
      details: failure,
    };
  } finally {
    socket?.destroy();
  }
}
