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

function getConfig(): MailConfig | null {
  const {
    GMAIL_SMTP_HOST,
    GMAIL_SMTP_PORT,
    GMAIL_SMTP_SECURE,
    GMAIL_SMTP_USER,
    GMAIL_SMTP_APP_PASSWORD,
    EMAIL_FROM_NAME,
    EMAIL_FROM_ADDRESS,
  } = process.env;
  if (!GMAIL_SMTP_USER || !GMAIL_SMTP_APP_PASSWORD)
    return null;
  const host = GMAIL_SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(GMAIL_SMTP_PORT ?? "587");
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
  const socket = net.connect(config.port, config.host);

  try {
    socket.setTimeout(15_000);
    await readResponse(socket, buffer);
    await sendCommand(socket, buffer, `EHLO ${config.host}`);
    if (!config.secure) {
      await sendCommand(socket, buffer, "STARTTLS");
      const tlsSocket = await upgradeToTls(socket, config.host);
      buffer.value = "";
      await sendCommand(tlsSocket, buffer, `EHLO ${config.host}`);
      await sendCommand(tlsSocket, buffer, "AUTH LOGIN");
      await sendCommand(
        tlsSocket,
        buffer,
        Buffer.from(config.user).toString("base64"),
      );
      await sendCommand(
        tlsSocket,
        buffer,
        Buffer.from(config.password).toString("base64"),
      );
      await sendCommand(
        tlsSocket,
        buffer,
        `MAIL FROM:<${message.fromAddress ?? config.fromAddress}>`,
      );
      await sendCommand(tlsSocket, buffer, `RCPT TO:<${message.to}>`);
      await sendCommand(tlsSocket, buffer, "DATA");
      tlsSocket.write(`${formatHeaders(message, config)}\r\n.\r\n`);
      await readResponse(tlsSocket, buffer);
      await sendCommand(tlsSocket, buffer, "QUIT");
      tlsSocket.end();
      return { ok: true as const };
    }

    const tlsSocket = tls.connect({
      socket,
      servername: config.host,
    });
    await new Promise<void>((resolve, reject) => {
      tlsSocket.once("secureConnect", () => resolve());
      tlsSocket.once("error", reject);
    });
    buffer.value = "";
    await readResponse(tlsSocket, buffer);
    await sendCommand(tlsSocket, buffer, `EHLO ${config.host}`);
    await sendCommand(tlsSocket, buffer, "AUTH LOGIN");
    await sendCommand(
      tlsSocket,
      buffer,
      Buffer.from(config.user).toString("base64"),
    );
    await sendCommand(
      tlsSocket,
      buffer,
      Buffer.from(config.password).toString("base64"),
    );
    await sendCommand(
      tlsSocket,
      buffer,
      `MAIL FROM:<${message.fromAddress ?? config.fromAddress}>`,
    );
    await sendCommand(tlsSocket, buffer, `RCPT TO:<${message.to}>`);
    await sendCommand(tlsSocket, buffer, "DATA");
    tlsSocket.write(`${formatHeaders(message, config)}\r\n.\r\n`);
    await readResponse(tlsSocket, buffer);
    await sendCommand(tlsSocket, buffer, "QUIT");
    tlsSocket.end();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "SMTP delivery failed.",
    };
  } finally {
    socket.destroy();
  }
}
