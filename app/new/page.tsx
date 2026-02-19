import { auth } from "@clerk/nextjs/server";
import { AppNav } from "@/components/app-nav";
import SetupWizardPage from "../setup-wizard-page";

export default async function NewBrandPage() {
  const { userId } = await auth();

  return (
    <>
      {userId ? <AppNav /> : null}
      <SetupWizardPage />
    </>
  );
}
