import Image from "next/image";
import Login from './auth/login/page';
import DashboardPage from "./pages/dashboard/page";
import EntityPage from "./pages/EntitySearch/[id]/page";

export default function Home() {
  return (
   <div>
   <DashboardPage/>
   <EntityPage/>
    <Login/>

   </div>
  );
}
