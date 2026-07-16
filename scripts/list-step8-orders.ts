import { PrismaClient } from "@prisma/client";
const db=new PrismaClient();
async function main(){const orders=await db.order.findMany({select:{id:true,orderNumber:true,status:true,riderId:true,payment:{select:{status:true}},store:{select:{name:true}}},orderBy:{createdAt:"desc"}});console.log(JSON.stringify(orders))}
main().finally(()=>db.$disconnect());
