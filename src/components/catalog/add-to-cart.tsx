"use client";
import { useState } from "react";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import { CartProduct } from "@/lib/cart-types";
import { useCart } from "@/components/cart/cart-provider";

export function AddToCart({product,disabled=false}:{product:CartProduct;disabled?:boolean}){
 const cart=useCart();const [added,setAdded]=useState(false);const [conflict,setConflict]=useState<string|null>(null);
 function add(){const result=cart.addItem(product);if(!result.ok){setConflict(result.conflictStoreName);return}setAdded(true);setTimeout(()=>setAdded(false),1400)}
 function replaceCart(){cart.replaceWith(product);setConflict(null);setAdded(true);setTimeout(()=>setAdded(false),1400)}
 return <><button className={`catalog-add ${added?"added":""}`} onClick={add} disabled={disabled}>{disabled?"Unavailable":added?<><Check/> Added</>:<><Plus/> Add to cart</>}</button>{conflict&&<div className="cart-warning-backdrop"><div className="cart-warning" role="dialog" aria-modal="true" aria-labelledby="cart-warning-title"><button className="cart-warning-close" onClick={()=>setConflict(null)} aria-label="Close"><X/></button><span><AlertTriangle/></span><h3 id="cart-warning-title">Start a new cart?</h3><p>Your cart contains items from <b>{conflict}</b>. Karame Bay currently supports one store per checkout.</p><div><button onClick={()=>setConflict(null)}>Keep my cart</button><button onClick={replaceCart}>Clear cart and add</button></div></div></div>}</>
}
