import { pgTable, text, uuid, integer } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { relations } from 'drizzle-orm';
import { productVariants } from '../variants';

export const packTypes = pgTable('pack_types', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(), // Standard, Deluxe, Premium
    slug: text('slug').notNull().unique(),
    cardCount: integer('card_count').notNull(), // 8, 15, 25
    sortOrder: integer('sort_order').notNull().default(0),
});

export const packTypesRelations = relations(packTypes, ({ many }) => ({
    variants: many(productVariants),
}));

export const insertPackTypeSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    cardCount: z.number().int().positive(),
    sortOrder: z.number().int().default(0),
});

export const selectPackTypeSchema = insertPackTypeSchema.extend({
    id: z.string().uuid(),
});

export type InsertPackType = z.infer<typeof insertPackTypeSchema>;
export type SelectPackType = z.infer<typeof selectPackTypeSchema>;