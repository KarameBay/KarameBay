import { PrismaClient } from "@prisma/client";

const db=new PrismaClient();
async function verify(){
 const stores=await db.store.findMany({include:{_count:{select:{products:true}}}});
 const categories=await db.category.count();
 const products=await db.product.count();
 if(stores.length!==3)throw new Error(`Expected 3 stores, found ${stores.length}`);
 if(categories<1||products<1)throw new Error("Catalog seed data is missing");
 if(stores.some(store=>store._count.products===0))throw new Error("Every store must have demo products");
 console.log(`Verified ${stores.length} stores, ${categories} categories, and ${products} products.`);
 for(const store of stores)console.log(`- ${store.name}: ${store._count.products} products`);
}
verify().catch(error=>{console.error(error);process.exit(1)}).finally(()=>db.$disconnect());
