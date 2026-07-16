import { PrismaClient } from "@prisma/client";
const db=new PrismaClient();
async function main(){const store=await db.store.findUniqueOrThrow({where:{slug:"kimironko-market"}});const category=await db.category.findFirstOrThrow();const order=await db.order.findFirst({where:{storeId:store.id,status:{in:["PENDING","ACCEPTED","PREPARING"]}},orderBy:{createdAt:"desc"}});const otherProduct=await db.product.findFirstOrThrow({where:{store:{slug:"java-house-kigali-heights"}}});console.log(JSON.stringify({storeId:store.id,categoryId:category.id,orderId:order?.id,orderStatus:order?.status,otherProductId:otherProduct.id}))}
main().finally(()=>db.$disconnect());
