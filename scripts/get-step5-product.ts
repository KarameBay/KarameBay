import { PrismaClient } from "@prisma/client";
const db=new PrismaClient();
async function main(){const product=await db.product.findFirstOrThrow({where:{store:{slug:"kimironko-market"},isAvailable:true},select:{id:true}});console.log(product.id)}
main().finally(()=>db.$disconnect());
