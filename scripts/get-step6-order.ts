import { PrismaClient } from "@prisma/client";
const db=new PrismaClient();
async function main(){const order=await db.order.findFirstOrThrow({where:{customer:{email:"customer@karamebay.rw"}},orderBy:{createdAt:"desc"},select:{id:true,orderNumber:true,customer:{select:{email:true}}}});console.log(JSON.stringify(order))}
main().finally(()=>db.$disconnect());
