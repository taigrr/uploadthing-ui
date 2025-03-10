import UTUIButtonProton from "@/registry/new-york/button-proton/button-proton";
import UTUIButtonUploadthing from "@/registry/new-york/ut-button-uploadthing/button-uploadthing";

// This page displays items from the custom registry.
// You are free to implement this with your own design as needed.

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col min-h-svh px-4 py-8 gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Uploadthing UI Registry
        </h1>
        <p className="text-muted-foreground">
          A custom registry for the Uploadthing UI Components.
        </p>
      </header>
      <main className="flex flex-1 gap-8 flex-col-reverse">
        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground sm:pl-3">
              A button taken inspiration from the proton drive UI
            </h2>
          </div>
          <div className="flex items-center justify-center min-h-[400px] relative">
            <UTUIButtonProton />
          </div>
        </div>
        <div className="flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground sm:pl-3">
              A button taken inspiration from the uploadthing&apos;s admin page
            </h2>
          </div>
          <div className="flex items-center justify-center min-h-[400px] relative">
            <UTUIButtonUploadthing />
          </div>
        </div>
      </main>
    </div>
  );
}
