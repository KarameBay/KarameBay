import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const expectedRoles = ["CUSTOMER", "STORE_OWNER", "RIDER", "ADMIN"];
const expectedStores = ["Java House Kigali Heights", "Kimironko Market", "Zinia Kicukiro Market"];

async function verify() {
  const users = await db.user.findMany({select:{role:true}});
  const stores = await db.store.findMany({orderBy:{name:"asc"},select:{name:true,owner:{select:{role:true}}}});
  const roles = new Set(users.map(user=>user.role));
  if (!expectedRoles.every(role=>roles.has(role))) throw new Error("One or more roles are missing");
  if (stores.length!==3 || !expectedStores.every(name=>stores.some(store=>store.name===name))) throw new Error("Phase 1 stores are incorrect");
  if (stores.some(store=>store.owner.role!=="STORE_OWNER")) throw new Error("A store is not attached to a Store Owner");
  console.log(`Verified ${users.length} users, ${roles.size} roles, and ${stores.length} stores.`);
}

verify().catch(error=>{console.error(error);process.exit(1)}).finally(()=>db.$disconnect());
