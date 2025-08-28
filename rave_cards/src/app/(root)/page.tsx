import React from "react";
import { Card } from "@/components";

const products = [
    {
        id: 1,
        title: "Electric Forest Pack",
        subtitle: "EDM Fest Packs",
        meta: "6 Styles",
        price: 49.99,
        imageSrc: "/trading-cards/pack-2.png",
        badge: { label: "New", tone: "orange" as const },
    },
    {
        id: 2,
        title: "Tomorrowland Pack",
        subtitle: "EDM Fest Packs",
        meta: "4 Styles",
        price: 29.99,
        imageSrc: "/trading-cards/pack-5.png",
        badge: { label: "Hot", tone: "red" as const },
    },
    {
        id: 3,
        title: "Lost Lands Pack",
        subtitle: "EDM Fest Packs",
        meta: "6 Styles",
        price: 59.99,
        imageSrc: "/trading-cards/pack-4.png",
        badge: { label: "Trending", tone: "green" as const },
    },
    {
        id: 4,
        title: "Electric Zoo Pack",
        subtitle: "EDM Fest Packs",
        meta: "3 Styles",
        price: 39.99,
        imageSrc: "/trading-cards/pack-3.png",
    },
];

const Home = () => {
    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <section aria-labelledby="latest" className="pb-12">
                <h2 id="latest" className="mb-6 text-heading-3 text-dark-900">
                    Latest packs
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((p) => (
                        <Card
                            key={p.id}
                            title={p.title}
                            subtitle={p.subtitle}
                            meta={p.meta}
                            imageSrc={p.imageSrc}
                            price={p.price}
                            badge={p.badge}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
};

export default Home;