import { PrismaClient } from "@prisma/client";
const db=new PrismaClient();
async function main(){const order=await db.order.findFirstOrThrow({where:{payment:{status:"PAID"},OR:[{riderId:null,status:{in:["ACCEPTED","PREPARING","READY_FOR_PICKUP"]}},{riderId:{not:null},status:{in:["READY_FOR_PICKUP","PICKED_UP","ON_THE_WAY"]}}]},orderBy:{createdAt:"desc"},select:{id:true,orderNumber:true,status:true,riderId:true}});console.log(JSON.stringify(order))}
main().finally(()=>db.$disconnect());
