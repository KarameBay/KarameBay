import { PrismaClient } from "@prisma/client";
const db=new PrismaClient();
async function main(){const order=await db.order.findFirstOrThrow({where:{orderNumber:"KB-20260629-420786"},include:{rider:true,events:true}});if(order.status!=="DELIVERED"||!order.rider)throw new Error("Rider workflow is incomplete");console.log(`Verified ${order.orderNumber}: ${order.status}, rider ${order.rider.firstName} ${order.rider.lastName}, ${order.events.length} events, ${order.deliveryFeeRwf} RWF earnings.`)}
main().finally(()=>db.$disconnect());
