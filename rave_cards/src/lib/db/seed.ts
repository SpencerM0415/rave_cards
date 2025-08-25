import { db } from '@/lib/db';
import {
    brands, categories, collections, productCollections,
    products, productVariants, productImages,
    insertBrandSchema, insertCategorySchema, insertCollectionSchema,
    insertProductSchema, insertVariantSchema, insertProductImageSchema,
    type InsertProduct, type InsertVariant, type InsertProductImage,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { mkdirSync, existsSync, cpSync } from 'fs';
import { join, basename } from 'path';

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;

const log = (...args: unknown[]) => console.log('[seed]', ...args);
const err = (...args: unknown[]) => console.error('[seed:error]', ...args);

function pick<T>(arr: T[], n: number) {
    const a = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && a.length; i++) {
        const idx = Math.floor(Math.random() * a.length);
        out.push(a.splice(idx, 1)[0]);
    }
    return out;
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
    try {
        log('Seeding brands: Festival Organizers');
        const brandRows = [
            { name: 'Coachella', slug: 'coachella', logoUrl: undefined },
            { name: 'Lollapalooza', slug: 'lollapalooza', logoUrl: undefined },
            { name: 'Bonnaroo', slug: 'bonnaroo', logoUrl: undefined },
            { name: 'Electric Daisy Carnival', slug: 'edc', logoUrl: undefined },
            { name: 'Burning Man', slug: 'burning-man', logoUrl: undefined },
            { name: 'Tomorrowland', slug: 'tomorrowland', logoUrl: undefined },
            { name: 'Ultra Music Festival', slug: 'ultra', logoUrl: undefined },
        ].map((b) => insertBrandSchema.parse(b));

        for (const row of brandRows) {
            const exists = await db.select().from(brands).where(eq(brands.slug, row.slug)).limit(1);
            if (!exists.length) await db.insert(brands).values(row);
        }

        log('Seeding categories: Card Pack Types');
        const catRows = [
            { name: 'Artist Cards', slug: 'artist-cards', parentId: null },
            { name: 'Headliner Packs', slug: 'headliner-packs', parentId: null },
            { name: 'Venue Cards', slug: 'venue-cards', parentId: null },
            { name: 'Limited Edition', slug: 'limited-edition', parentId: null },
            { name: 'Holographic Special', slug: 'holographic-special', parentId: null },
            { name: 'Vintage Collection', slug: 'vintage-collection', parentId: null },
        ].map((c) => insertCategorySchema.parse(c));

        for (const row of catRows) {
            const exists = await db.select().from(categories).where(eq(categories.slug, row.slug)).limit(1);
            if (!exists.length) await db.insert(categories).values(row);
        }

        log('Seeding collections: Festival Seasons');
        const collectionRows = [
            insertCollectionSchema.parse({ name: 'Summer Festival 2025', slug: 'summer-2025' }),
            insertCollectionSchema.parse({ name: 'Spring Lineup 2025', slug: 'spring-2025' }),
            insertCollectionSchema.parse({ name: 'EDM Legends', slug: 'edm-legends' }),
            insertCollectionSchema.parse({ name: 'Rock Heritage', slug: 'rock-heritage' }),
            insertCollectionSchema.parse({ name: 'New Releases', slug: 'new-releases' }),
        ];

        for (const row of collectionRows) {
            const exists = await db.select().from(collections).where(eq(collections.slug, row.slug)).limit(1);
            if (!exists.length) await db.insert(collections).values(row);
        }

        // Fetch all seeded data
        const allBrands = await db.select().from(brands);
        const allCategories = await db.select().from(categories);
        const allCollections = await db.select().from(collections);

        const uploadsRoot = join(process.cwd(), 'static', 'uploads', 'trading-cards');
        if (!existsSync(uploadsRoot)) {
            mkdirSync(uploadsRoot, { recursive: true });
        }

        const sourceDir = join(process.cwd(), 'public', 'trading-cards');

        // Product names for different card pack types
        const productTemplates = [
            { name: 'Coachella 2025 Artist Pack', brand: 'coachella', category: 'artist-cards' },
            { name: 'Lollapalooza Headliner Collection', brand: 'lollapalooza', category: 'headliner-packs' },
            { name: 'Bonnaroo Venue Memories', brand: 'bonnaroo', category: 'venue-cards' },
            { name: 'EDC Limited Edition Holographs', brand: 'edc', category: 'limited-edition' },
            { name: 'Burning Man Exclusive Series', brand: 'burning-man', category: 'holographic-special' },
            { name: 'Tomorrowland Main Stage Pack', brand: 'tomorrowland', category: 'artist-cards' },
            { name: 'Ultra 2025 DJ Legends', brand: 'ultra', category: 'headliner-packs' },
            { name: 'Coachella Vintage Collection', brand: 'coachella', category: 'vintage-collection' },
            { name: 'Lollapalooza Special Edition', brand: 'lollapalooza', category: 'limited-edition' },
            { name: 'Bonnaroo Artist Spotlight', brand: 'bonnaroo', category: 'artist-cards' },
            { name: 'EDC Holographic Deluxe', brand: 'edc', category: 'holographic-special' },
            { name: 'Burning Man Desert Dreams', brand: 'burning-man', category: 'venue-cards' },
            { name: 'Tomorrowland Heritage Pack', brand: 'tomorrowland', category: 'vintage-collection' },
            { name: 'Ultra Bass Legends', brand: 'ultra', category: 'headliner-packs' },
            { name: 'Coachella Indie Artist Pack', brand: 'coachella', category: 'artist-cards' },
        ];

        // Source card pack images
        const sourceImages = [
            'pack-1.jpg', 'pack-2.webp', 'pack-3.webp', 'pack-4.webp', 'pack-5.avif',
            'pack-6.avif', 'pack-7.avif', 'pack-8.avif', 'pack-9.avif', 'pack-10.avif',
            'pack-11.avif', 'pack-12.avif', 'pack-13.avif', 'pack-14.avif', 'pack-15.avif',
        ];

        log('Creating trading card pack products with variants');

        for (let i = 0; i < productTemplates.length; i++) {
            const template = productTemplates[i];
            const brand = allBrands.find(b => b.slug === template.brand);
            const category = allCategories.find(c => c.slug === template.category);

            const desc = `Collectible trading card pack featuring exclusive ${brand?.name} festival content. Each pack contains rare artist cards, venue photography, and special edition memorabilia.`;

            const product = insertProductSchema.parse({
                name: template.name,
                description: desc,
                categoryId: category?.id ?? null,
                brandId: brand?.id ?? null,
                isPublished: true,
            });

            const retP = await db.insert(products).values(product as InsertProduct).returning();
            const insertedProduct = (retP as ProductRow[])[0];

            // Create variants for different pack sizes/types
            const packVariants = [
                { type: 'Standard', cards: 8, basePrice: 12.99 },
                { type: 'Deluxe', cards: 15, basePrice: 24.99 },
                { type: 'Premium', cards: 25, basePrice: 39.99 },
            ];

            const variantIds: string[] = [];
            let defaultVariantId: string | null = null;

            for (const packType of packVariants) {
                // Add some price variation
                const priceVariation = Math.random() < 0.2 ? randInt(-2, 3) : 0;
                const finalPrice = Math.max(packType.basePrice + priceVariation, 5.99);
                const discountedPrice = Math.random() < 0.25 ? Number((finalPrice * 0.85).toFixed(2)) : null;

                const sku = `${brand?.slug.toUpperCase()}-${packType.type.toUpperCase()}-${insertedProduct.id.slice(0, 8)}`;

                const variant = insertVariantSchema.parse({
                    productId: insertedProduct.id,
                    sku,
                    price: finalPrice.toFixed(2),
                    salePrice: discountedPrice?.toFixed(2),
                    inStock: randInt(10, 100),
                    weight: Number((packType.cards * 0.05 + 0.1).toFixed(2)), // Weight based on card count
                    dimensions: { length: 9, width: 6, height: 1 }, // Standard card pack dimensions
                });

                const retV = await db.insert(productVariants).values(variant as InsertVariant).returning();
                const created = (retV as VariantRow[])[0];
                variantIds.push(created.id);

                // Set the Standard pack as default variant
                if (packType.type === 'Standard') {
                    defaultVariantId = created.id;
                }
            }

            if (defaultVariantId) {
                await db.update(products).set({ defaultVariantId }).where(eq(products.id, insertedProduct.id));
            }

            // Add product image
            const pickName = sourceImages[i % sourceImages.length];
            const src = join(sourceDir, pickName);
            const destName = `${insertedProduct.id}-${basename(pickName)}`;
            const dest = join(uploadsRoot, destName);

            try {
                cpSync(src, dest);
                const img: InsertProductImage = insertProductImageSchema.parse({
                    productId: insertedProduct.id,
                    url: `/static/uploads/trading-cards/${destName}`,
                    sortOrder: 0,
                    isPrimary: true,
                });
                await db.insert(productImages).values(img);
            } catch (e) {
                err('Failed to copy product image', { src, dest, e });
            }

            // Assign to collections
            const collectionsForProduct = pick(allCollections, randInt(1, 3));
            for (const col of collectionsForProduct) {
                await db.insert(productCollections).values({
                    productId: insertedProduct.id,
                    collectionId: col.id,
                });
            }

            log(`Seeded product ${template.name} with ${variantIds.length} variants`);
        }

        log('Trading card pack seeding complete');
    } catch (e) {
        err(e);
        process.exitCode = 1;
    }
}

seed();