"use server";

import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    brands,
    categories,
    packTypes,
    productImages,
    productVariants,
    products,
    users,
    reviews,
    type SelectProduct,
    type SelectVariant,
    type SelectProductImage,
    type SelectBrand,
    type SelectCategory,
    type SelectPackType,
} from "@/lib/db/schema";

import { NormalizedProductFilters } from "@/lib/utils/query";

type ProductListItem = {
    id: string;
    name: string;
    imageUrl: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    createdAt: Date;
    subtitle?: string | null;
};

export type GetAllProductsResult = {
    products: ProductListItem[];
    totalCount: number;
};

export async function getAllProducts(filters: NormalizedProductFilters): Promise<GetAllProductsResult> {
    const conds: SQL[] = [eq(products.isPublished, true)];

    if (filters.search) {
        const pattern = `%${filters.search}%`;
        conds.push(or(ilike(products.name, pattern), ilike(products.description, pattern))!);
    }

    if (filters.brandSlugs.length) {
        conds.push(inArray(brands.slug, filters.brandSlugs));
    }

    if (filters.categorySlugs.length) {
        conds.push(inArray(categories.slug, filters.categorySlugs));
    }

    // For festival filtering, we need to filter by brand since festivals are our brands
    if (filters.festivalSlugs.length) {
        conds.push(inArray(brands.slug, filters.festivalSlugs));
    }

    const hasPackType = filters.packTypeSlugs.length > 0;
    const hasPrice = !!(filters.priceMin !== undefined || filters.priceMax !== undefined || filters.priceRanges.length);

    const variantConds: SQL[] = [];

    // Pack type filtering using the new packTypes relationship
    if (hasPackType) {
        variantConds.push(inArray(productVariants.packTypeId, db
            .select({ id: packTypes.id })
            .from(packTypes)
            .where(inArray(packTypes.slug, filters.packTypeSlugs))));
    }

    if (hasPrice) {
        const priceBounds: SQL[] = [];
        if (filters.priceRanges.length) {
            for (const [min, max] of filters.priceRanges) {
                const subConds: SQL[] = [];
                if (min !== undefined) {
                    subConds.push(sql`(${productVariants.price})::numeric >= ${min}`);
                }
                if (max !== undefined) {
                    subConds.push(sql`(${productVariants.price})::numeric <= ${max}`);
                }
                if (subConds.length) priceBounds.push(and(...subConds)!);
            }
        }
        if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
            const subConds: SQL[] = [];
            if (filters.priceMin !== undefined) subConds.push(sql`(${productVariants.price})::numeric >= ${filters.priceMin}`);
            if (filters.priceMax !== undefined) subConds.push(sql`(${productVariants.price})::numeric <= ${filters.priceMax}`);
            if (subConds.length) priceBounds.push(and(...subConds)!);
        }
        if (priceBounds.length) {
            variantConds.push(or(...priceBounds)!);
        }
    }

    const variantJoin = db
        .select({
            variantId: productVariants.id,
            productId: productVariants.productId,
            price: sql<number>`${productVariants.price}::numeric`.as("price"),
            sku: productVariants.sku,
        })
        .from(productVariants)
        .where(variantConds.length ? and(...variantConds) : undefined)
        .as("v");

    // Images join - simplified since we don't have color-specific images for trading cards
    const imagesJoin = db
        .select({
            productId: productImages.productId,
            url: productImages.url,
            rn: sql<number>`row_number() over (partition by ${productImages.productId} order by ${productImages.isPrimary} desc, ${productImages.sortOrder} asc)`.as("rn"),
        })
        .from(productImages)
        .where(isNull(productImages.variantId))
        .as("pi");

    const baseWhere = conds.length ? and(...conds) : undefined;

    const priceAgg = {
        minPrice: sql<number | null>`min(${variantJoin.price})`,
        maxPrice: sql<number | null>`max(${variantJoin.price})`,
    };

    const imageAgg = sql<string | null>`max(case when ${imagesJoin.rn} = 1 then ${imagesJoin.url} else null end)`;

    const primaryOrder =
        filters.sort === "price_asc"
            ? asc(sql`min(${variantJoin.price})`)
            : filters.sort === "price_desc"
                ? desc(sql`max(${variantJoin.price})`)
                : desc(products.createdAt);

    const page = Math.max(1, filters.page);
    const limit = Math.max(1, Math.min(filters.limit, 60));
    const offset = (page - 1) * limit;

    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            createdAt: products.createdAt,
            subtitle: brands.name,
            minPrice: priceAgg.minPrice,
            maxPrice: priceAgg.maxPrice,
            imageUrl: imageAgg,
        })
        .from(products)
        .leftJoin(variantJoin, eq(variantJoin.productId, products.id))
        .leftJoin(imagesJoin, eq(imagesJoin.productId, products.id))
        .leftJoin(brands, eq(brands.id, products.brandId))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(baseWhere)
        .groupBy(products.id, products.name, products.createdAt, brands.name)
        .orderBy(primaryOrder, desc(products.createdAt), asc(products.id))
        .limit(limit)
        .offset(offset);

    const countRows = await db
        .select({
            cnt: count(sql<number>`distinct ${products.id}`),
        })
        .from(products)
        .leftJoin(variantJoin, eq(variantJoin.productId, products.id))
        .leftJoin(brands, eq(brands.id, products.brandId))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(baseWhere);

    const productsOut: ProductListItem[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        imageUrl: r.imageUrl,
        minPrice: r.minPrice === null ? null : Number(r.minPrice),
        maxPrice: r.maxPrice === null ? null : Number(r.maxPrice),
        createdAt: r.createdAt,
        subtitle: r.subtitle ? `${r.subtitle} Trading Cards` : null,
    }));

    const totalCount = countRows[0]?.cnt ?? 0;

    return { products: productsOut, totalCount };
}

export type FullProduct = {
    product: SelectProduct & {
        brand?: SelectBrand | null;
        category?: SelectCategory | null;
    };
    variants: Array<SelectVariant>;
    images: SelectProductImage[];
};

export async function getProduct(productId: string): Promise<FullProduct | null> {
    const rows = await db
        .select({
            productId: products.id,
            productName: products.name,
            productDescription: products.description,
            productBrandId: products.brandId,
            productCategoryId: products.categoryId,
            isPublished: products.isPublished,
            defaultVariantId: products.defaultVariantId,
            productCreatedAt: products.createdAt,
            productUpdatedAt: products.updatedAt,

            brandId: brands.id,
            brandName: brands.name,
            brandSlug: brands.slug,
            brandLogoUrl: brands.logoUrl,

            categoryId: categories.id,
            categoryName: categories.name,
            categorySlug: categories.slug,

            variantId: productVariants.id,
            variantSku: productVariants.sku,
            variantPrice: sql<number | null>`${productVariants.price}::numeric`,
            variantSalePrice: sql<number | null>`${productVariants.salePrice}::numeric`,
            variantInStock: productVariants.inStock,
            variantWeight: productVariants.weight,
            variantDimensions: productVariants.dimensions,

            imageId: productImages.id,
            imageUrl: productImages.url,
            imageIsPrimary: productImages.isPrimary,
            imageSortOrder: productImages.sortOrder,
            imageVariantId: productImages.variantId,
        })
        .from(products)
        .leftJoin(brands, eq(brands.id, products.brandId))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(productVariants, eq(productVariants.productId, products.id))
        .leftJoin(productImages, eq(productImages.productId, products.id))
        .where(eq(products.id, productId));

    if (!rows.length) return null;

    const head = rows[0];

    const product: SelectProduct & {
        brand?: SelectBrand | null;
        category?: SelectCategory | null;
    } = {
        id: head.productId,
        name: head.productName,
        description: head.productDescription,
        brandId: head.productBrandId ?? null,
        categoryId: head.productCategoryId ?? null,
        isPublished: head.isPublished,
        defaultVariantId: head.defaultVariantId ?? null,
        createdAt: head.productCreatedAt,
        updatedAt: head.productUpdatedAt,
        brand: head.brandId
            ? {
                id: head.brandId,
                name: head.brandName!,
                slug: head.brandSlug!,
                logoUrl: head.brandLogoUrl ?? null,
            }
            : null,
        category: head.categoryId
            ? {
                id: head.categoryId,
                name: head.categoryName!,
                slug: head.categorySlug!,
                parentId: null,
            }
            : null,
    };

    const variantsMap = new Map<string, SelectVariant>();
    const imagesMap = new Map<string, SelectProductImage>();

    for (const r of rows) {
        if (r.variantId && !variantsMap.has(r.variantId)) {
            variantsMap.set(r.variantId, {
                id: r.variantId,
                productId: head.productId,
                sku: r.variantSku!,
                price: r.variantPrice !== null ? String(r.variantPrice) : "0",
                salePrice: r.variantSalePrice !== null ? String(r.variantSalePrice) : undefined,
                inStock: r.variantInStock!,
                weight: r.variantWeight ? Number(r.variantWeight) : undefined,
                dimensions: r.variantDimensions ?? undefined,
                createdAt: head.productCreatedAt,
            });
        }
        if (r.imageId && !imagesMap.has(r.imageId)) {
            imagesMap.set(r.imageId, {
                id: r.imageId,
                productId: head.productId,
                variantId: r.imageVariantId ?? null,
                url: r.imageUrl!,
                sortOrder: r.imageSortOrder ?? 0,
                isPrimary: r.imageIsPrimary ?? false,
            });
        }
    }

    return {
        product,
        variants: Array.from(variantsMap.values()),
        images: Array.from(imagesMap.values()),
    };
}

export type Review = {
    id: string;
    author: string;
    rating: number;
    title?: string;
    content: string;
    createdAt: string;
};

export type RecommendedProduct = {
    id: string;
    title: string;
    price: number | null;
    imageUrl: string;
};

export async function getProductReviews(productId: string): Promise<Review[]> {
    const rows = await db
        .select({
            id: reviews.id,
            rating: reviews.rating,
            comment: reviews.comment,
            createdAt: reviews.createdAt,
            authorName: users.name,
            authorEmail: users.email,
        })
        .from(reviews)
        .innerJoin(users, eq(users.id, reviews.userId))
        .where(eq(reviews.productId, productId))
        .orderBy(desc(reviews.createdAt))
        .limit(10);

    return rows.map((r) => ({
        id: r.id,
        author: r.authorName?.trim() || r.authorEmail || "Anonymous",
        rating: r.rating,
        title: undefined,
        content: r.comment || "",
        createdAt: r.createdAt.toISOString(),
    }));
}

export async function getRecommendedProducts(productId: string): Promise<RecommendedProduct[]> {
    const base = await db
        .select({
            id: products.id,
            categoryId: products.categoryId,
            brandId: products.brandId,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

    if (!base.length) return [];
    const b = base[0];

    const v = db
        .select({
            productId: productVariants.productId,
            price: sql<number>`${productVariants.price}::numeric`.as("price"),
        })
        .from(productVariants)
        .as("v");

    const pi = db
        .select({
            productId: productImages.productId,
            url: productImages.url,
            rn: sql<number>`row_number() over (partition by ${productImages.productId} order by ${productImages.isPrimary} desc, ${productImages.sortOrder} asc)`.as(
                "rn",
            ),
        })
        .from(productImages)
        .as("pi");

    // Priority scoring for recommendations - category and brand matching for trading cards
    const priority = sql<number>`
            (case when ${products.categoryId} is not null and ${products.categoryId} = ${b.categoryId} then 1 else 0 end) * 3 +
    (case when ${products.brandId} is not null and ${products.brandId} = ${b.brandId} then 1 else 0 end) * 2
    `;

    const rows = await db
        .select({
            id: products.id,
            title: products.name,
            minPrice: sql<number | null>`min(${v.price})`,
            imageUrl: sql<string | null>`max(case when ${pi.rn} = 1 then ${pi.url} else null end)`,
            createdAt: products.createdAt,
        })
        .from(products)
        .leftJoin(v, eq(v.productId, products.id))
        .leftJoin(pi, eq(pi.productId, products.id))
        .where(and(eq(products.isPublished, true), sql`${products.id} <> ${productId}`))
        .groupBy(products.id, products.name, products.createdAt)
        .orderBy(
            desc(priority),
            desc(products.createdAt),
            asc(products.id)
        )
        .limit(8);

    const out: RecommendedProduct[] = [];
    for (const r of rows) {
        const img = r.imageUrl?.trim();
        if (!img) continue;
        out.push({
            id: r.id,
            title: r.title,
            price: r.minPrice === null ? null : Number(r.minPrice),
            imageUrl: img,
        });
        if (out.length >= 6) break;
    }
    return out;
}