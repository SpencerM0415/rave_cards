"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getArrayParam, removeParams, toggleArrayParam } from "@/lib/utils/query";

const FESTIVALS = ["coachella", "lollapalooza", "bonnaroo", "edc", "burning-man", "tomorrowland", "ultra"] as const;
const CATEGORIES = ["artist-cards", "headliner-trading-cards", "venue-cards", "limited-edition", "holographic-special", "vintage-collection"] as const;
const PACK_TYPES = ["standard", "deluxe", "premium"] as const;
const PRICES = [
    { id: "0-15", label: "$0 - $15" },
    { id: "15-30", label: "$15 - $30" },
    { id: "30-50", label: "$30 - $50" },
    { id: "50-", label: "Over $50" },
] as const;

type GroupKey = "festival" | "category" | "packType" | "price";

export default function Filters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = useMemo(() => `?${searchParams.toString()}`, [searchParams]);

    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<Record<GroupKey, boolean>>({
        festival: false,
        category: false,
        packType: false,
        price: false,
    });

    const activeCounts = {
        festival: getArrayParam(search, "festival").length,
        category: getArrayParam(search, "category").length,
        packType: getArrayParam(search, "packType").length,
        price: getArrayParam(search, "price").length,
    };

    useEffect(() => {
        setOpen(false);
    }, [search]);

    const onToggle = (key: GroupKey, value: string) => {
        const url = toggleArrayParam(pathname, search, key, value);
        router.push(url, { scroll: false });
    };

    const clearAll = () => {
        const url = removeParams(pathname, search, ["festival", "category", "packType", "price", "page"]);
        router.push(url, { scroll: false });
    };

    const formatLabel = (value: string) => {
        return value
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const Group = ({
                       title,
                       children,
                       k,
                   }: {
        title: string;
        children: import("react").ReactNode;
        k: GroupKey;
    }) => (
        <div className="border-b border-light-300 py-4">
            <button
                className="flex w-full items-center justify-between text-body-medium text-dark-900"
                onClick={() => setExpanded((s) => ({ ...s, [k]: !s[k] }))}
                aria-expanded={expanded[k]}
                aria-controls={`${k}-section`}
            >
                <span>{title}</span>
                <span className="text-caption text-dark-700">{expanded[k] ? "−" : "+"}</span>
            </button>
            <div id={`${k}-section`} className={`${expanded[k] ? "mt-3 block" : "hidden"}`}>
                {children}
            </div>
        </div>
    );

    return (
        <>
            <div className="mb-4 flex items-center justify-between md:hidden">
                <button
                    className="rounded-md border border-light-300 px-3 py-2 text-body-medium"
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                >
                    Filters
                </button>
                <button className="text-caption text-dark-700 underline" onClick={clearAll}>
                    Clear all
                </button>
            </div>

            <aside className="sticky top-20 hidden h-fit min-w-60 rounded-lg border border-light-300 bg-light-100 p-4 md:block">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-body-medium text-dark-900">Filters</h3>
                    <button className="text-caption text-dark-700 underline" onClick={clearAll}>
                        Clear all
                    </button>
                </div>

                <Group title={`Festival ${activeCounts.festival ? `(${activeCounts.festival})` : ""}`} k="festival">
                    <ul className="space-y-2">
                        {FESTIVALS.map((f) => {
                            const checked = getArrayParam(search, "festival").includes(f);
                            return (
                                <li key={f} className="flex items-center gap-2">
                                    <input
                                        id={`festival-${f}`}
                                        type="checkbox"
                                        className="h-4 w-4 accent-dark-900"
                                        checked={checked}
                                        onChange={() => onToggle("festival" as GroupKey, f)}
                                    />
                                    <label htmlFor={`festival-${f}`} className="text-body text-dark-900">
                                        {formatLabel(f)}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </Group>

                <Group title={`Category ${activeCounts.category ? `(${activeCounts.category})` : ""}`} k="category">
                    <ul className="space-y-2">
                        {CATEGORIES.map((c) => {
                            const checked = getArrayParam(search, "category").includes(c);
                            return (
                                <li key={c} className="flex items-center gap-2">
                                    <input
                                        id={`category-${c}`}
                                        type="checkbox"
                                        className="h-4 w-4 accent-dark-900"
                                        checked={checked}
                                        onChange={() => onToggle("category", c)}
                                    />
                                    <label htmlFor={`category-${c}`} className="text-body text-dark-900">
                                        {formatLabel(c)}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </Group>

                <Group title={`Pack Type ${activeCounts.packType ? `(${activeCounts.packType})` : ""}`} k="packType">
                    <ul className="grid grid-cols-1 gap-2">
                        {PACK_TYPES.map((t) => {
                            const checked = getArrayParam(search, "packType").includes(t);
                            return (
                                <li key={t} className="flex items-center gap-2">
                                    <input
                                        id={`packType-${t}`}
                                        type="checkbox"
                                        className="h-4 w-4 accent-dark-900"
                                        checked={checked}
                                        onChange={() => onToggle("packType", t)}
                                    />
                                    <label htmlFor={`packType-${t}`} className="text-body text-dark-900 capitalize">
                                        {t}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </Group>

                <Group title={`Price ${activeCounts.price ? `(${activeCounts.price})` : ""}`} k="price">
                    <ul className="space-y-2">
                        {PRICES.map((p) => {
                            const checked = getArrayParam(search, "price").includes(p.id);
                            return (
                                <li key={p.id} className="flex items-center gap-2">
                                    <input
                                        id={`price-${p.id}`}
                                        type="checkbox"
                                        className="h-4 w-4 accent-dark-900"
                                        checked={checked}
                                        onChange={() => onToggle("price", p.id)}
                                    />
                                    <label htmlFor={`price-${p.id}`} className="text-body">
                                        {p.label}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </Group>
            </aside>

            {open && (
                <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
                    <div
                        className="absolute inset-0 bg-black/40"
                        aria-hidden="true"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute inset-y-0 left-0 w-80 max-w-[80%] overflow-auto bg-light-100 p-4 shadow-xl">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-body-medium">Filters</h3>
                            <button className="text-caption text-dark-700 underline" onClick={clearAll}>
                                Clear all
                            </button>
                        </div>
                        {/* Mobile filter content */}
                        <div className="md:hidden">
                            <Group title="Festival" k="festival">
                                <ul className="space-y-2">
                                    {FESTIVALS.map((f) => {
                                        const checked = getArrayParam(search, "festival").includes(f);
                                        return (
                                            <li key={f} className="flex items-center gap-2">
                                                <input
                                                    id={`m-festival-${f}`}
                                                    type="checkbox"
                                                    className="h-4 w-4 accent-dark-900"
                                                    checked={checked}
                                                    onChange={() => onToggle("festival", f)}
                                                />
                                                <label htmlFor={`m-festival-${f}`} className="text-body">
                                                    {formatLabel(f)}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Group>

                            <Group title="Category" k="category">
                                <ul className="space-y-2">
                                    {CATEGORIES.map((c) => {
                                        const checked = getArrayParam(search, "category").includes(c);
                                        return (
                                            <li key={c} className="flex items-center gap-2">
                                                <input
                                                    id={`m-category-${c}`}
                                                    type="checkbox"
                                                    className="h-4 w-4 accent-dark-900"
                                                    checked={checked}
                                                    onChange={() => onToggle("category", c)}
                                                />
                                                <label htmlFor={`m-category-${c}`} className="text-body">
                                                    {formatLabel(c)}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Group>

                            <Group title="Pack Type" k="packType">
                                <ul className="space-y-2">
                                    {PACK_TYPES.map((t) => {
                                        const checked = getArrayParam(search, "packType").includes(t);
                                        return (
                                            <li key={t} className="flex items-center gap-2">
                                                <input
                                                    id={`m-packType-${t}`}
                                                    type="checkbox"
                                                    className="h-4 w-4 accent-dark-900"
                                                    checked={checked}
                                                    onChange={() => onToggle("packType", t)}
                                                />
                                                <label htmlFor={`m-packType-${t}`} className="text-body capitalize">
                                                    {t}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Group>

                            <Group title="Price" k="price">
                                <ul className="space-y-2">
                                    {PRICES.map((p) => {
                                        const checked = getArrayParam(search, "price").includes(p.id);
                                        return (
                                            <li key={p.id} className="flex items-center gap-2">
                                                <input
                                                    id={`m-price-${p.id}`}
                                                    type="checkbox"
                                                    className="h-4 w-4 accent-dark-900"
                                                    checked={checked}
                                                    onChange={() => onToggle("price", p.id)}
                                                />
                                                <label htmlFor={`m-price-${p.id}`} className="text-body">
                                                    {p.label}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Group>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}