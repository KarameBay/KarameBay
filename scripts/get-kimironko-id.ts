import { PrismaClient } from "@prisma/client";
const db=new PrismaClient();
async function main(){const store=await db.store.findUniqueOrThrow({where:{slug:"kimironko-market"},select:{id:true}});console.log(store.id)}
main().finally(()=>db.$disconnect());
