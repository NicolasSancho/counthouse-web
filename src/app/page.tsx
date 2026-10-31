import { redirect } from "next/navigation";

// Products is the only screen so far. A temporary redirect, because `/` will route by session once
// sign-in exists, and browsers cache a permanent one.
export default function Home() {
  redirect("/products");
}
