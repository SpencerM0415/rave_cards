import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            <section className="hidden lg:flex flex-col justify-between bg-dark-900 text-light-100 p-10">
                <div className="flex items-center">
                    <div className="h-20 w-20 rounded-md bg-orange inline-flex items-center justify-center">
                        <Image src="/logo.png" alt="RaveCards" width={80} height={80} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-heading-2">RaveCards</h2>
                    <p className="max-w-md text-lead text-light-300">
                        Join fellow fesitval enjoyers in collecting and trading cards.
                    </p>
                    <div className="flex gap-2" aria-hidden="true">
                        <span className="h-2 w-2 rounded-full bg-light-100/90" />
                        <span className="h-2 w-2 rounded-full bg-light-100/50" />
                        <span className="h-2 w-2 rounded-full bg-light-100/50" />
                    </div>
                </div>

                <p className="text-footnote text-light-400">© 2025 RaveCards. All rights reserved.</p>
            </section>

            <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
                <div className="w-full max-w-md">{children}</div>
            </section>
        </main>
    );
}