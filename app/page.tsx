import { auth } from "@clerk/nextjs/server";
import { AppNav } from "@/components/app-nav";
import { prisma } from "@/lib/db/prisma";
import HomeDashboard from "./home-dashboard";
import SetupWizardPage from "./setup-wizard-page";

export default async function HomePage() {
  const { userId } = await auth();
  const brands = userId
    ? await prisma.brandKit.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, createdAt: true, kitJson: true },
      })
    : [];

  return (
    <>
      {userId ? <AppNav /> : null}
      {userId && brands.length > 0 ? (
        <HomeDashboard brands={brands} />
      ) : (
        <SetupWizardPage />
      )}
    </>
  );
}
