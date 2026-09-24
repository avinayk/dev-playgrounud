// src/controllers/admin/adminSponsors.controller.ts
import type { Request, Response } from 'express';
import pool from '../../config/database';

export class AdminSponsorsController {
  /* ═══════════════════════════════════════════
     GET /api/admin/sponsors
     ═══════════════════════════════════════════ */
  static async getAllSponsors(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute<any[]>(
        `SELECT 
          id,
          brand_name AS brandName,
          company_name AS companyName,
          logo_url AS logoUrl,
          banner_url AS bannerUrl,
          category,
          sponsor_tier AS sponsorTier,
          target_sports AS targetSports,
          placement_locations AS placementLocations,
          headline,
          description,
          cta_text AS ctaText,
          cta_link AS ctaLink,
          discount_code AS discountCode,
          xp_reward AS xpReward,
          status,
          impression_count AS impressionCount,
          click_count AS clickCount,
          contact_email AS contactEmail,
          notes,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM sponsors
         ORDER BY 
           CASE sponsor_tier
             WHEN 'title' THEN 1
             WHEN 'gold' THEN 2
             WHEN 'silver' THEN 3
             ELSE 4
           END,
           created_at DESC`
      );

      const sponsors = rows.map((r) => ({
        ...r,
        targetSports:
          typeof r.targetSports === 'string'
            ? JSON.parse(r.targetSports)
            : r.targetSports || ['all'],
        placementLocations:
          typeof r.placementLocations === 'string'
            ? JSON.parse(r.placementLocations)
            : r.placementLocations || ['dashboard'],
      }));

      res.status(200).json({
        success: true,
        count: sponsors.length,
        data: sponsors,
      });
    } catch (err: any) {
      console.error('❌ Get sponsors error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch sponsors',
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/admin/sponsors
     ═══════════════════════════════════════════ */
  static async createSponsor(req: Request, res: Response): Promise<void> {
    try {
      const {
        brandName,
        companyName,
        logoUrl,
        bannerUrl,
        category,
        sponsorTier,
        targetSports,
        placementLocations,
        headline,
        description,
        ctaText,
        ctaLink,
        discountCode,
        xpReward,
        status,
        contactEmail,
        notes,
      } = req.body;

      if (!brandName || !headline) {
        res.status(400).json({
          success: false,
          message: 'brandName and headline are required',
        });
        return;
      }

      const id = `spon_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      await pool.execute(
        `INSERT INTO sponsors 
         (id, brand_name, company_name, logo_url, banner_url, category, sponsor_tier, 
          target_sports, placement_locations, headline, description, cta_text, cta_link, 
          discount_code, xp_reward, status, contact_email, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          brandName,
          companyName || brandName,
          logoUrl || null,
          bannerUrl || null,
          category || 'gear',
          sponsorTier || 'gold',
          JSON.stringify(targetSports || ['all']),
          JSON.stringify(placementLocations || ['dashboard']),
          headline,
          description || null,
          ctaText || 'Claim Offer',
          ctaLink || null,
          discountCode || null,
          xpReward || 25,
          status || 'active',
          contactEmail || null,
          notes || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Sponsor created successfully',
        data: { id },
      });
    } catch (err: any) {
      console.error('❌ Create sponsor error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to create sponsor',
      });
    }
  }

  /* ═══════════════════════════════════════════
     PATCH /api/admin/sponsors/:sponsorId
     ═══════════════════════════════════════════ */
  static async updateSponsor(req: Request, res: Response): Promise<void> {
    try {
      const { sponsorId } = req.params;
      const updates = req.body;

      const fieldMap: Record<string, string> = {
        brandName: 'brand_name',
        companyName: 'company_name',
        logoUrl: 'logo_url',
        bannerUrl: 'banner_url',
        category: 'category',
        sponsorTier: 'sponsor_tier',
        targetSports: 'target_sports',
        placementLocations: 'placement_locations',
        headline: 'headline',
        description: 'description',
        ctaText: 'cta_text',
        ctaLink: 'cta_link',
        discountCode: 'discount_code',
        xpReward: 'xp_reward',
        status: 'status',
        contactEmail: 'contact_email',
        notes: 'notes',
        impressionCount: 'impression_count',
        clickCount: 'click_count',
      };

      const setClauses: string[] = [];
      const values: any[] = [];

      Object.keys(updates).forEach((key) => {
        const dbField = fieldMap[key];
        if (dbField) {
          setClauses.push(`${dbField} = ?`);
          let val = updates[key];
          if (key === 'targetSports' || key === 'placementLocations') {
            val = JSON.stringify(val);
          }
          values.push(val);
        }
      });

      if (setClauses.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
        return;
      }

      values.push(sponsorId);

      const [result] = await pool.execute<any>(
        `UPDATE sponsors SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'Sponsor not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Sponsor updated successfully',
      });
    } catch (err: any) {
      console.error('❌ Update sponsor error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to update sponsor',
      });
    }
  }

  /* ═══════════════════════════════════════════
     DELETE /api/admin/sponsors/:sponsorId
     ═══════════════════════════════════════════ */
  static async deleteSponsor(req: Request, res: Response): Promise<void> {
    try {
      const { sponsorId } = req.params;

      const [result] = await pool.execute<any>(
        `DELETE FROM sponsors WHERE id = ?`,
        [sponsorId]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'Sponsor not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Sponsor deleted successfully',
      });
    } catch (err: any) {
      console.error('❌ Delete sponsor error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to delete sponsor',
      });
    }
  }

  /* ═══════════════════════════════════════════
     POST /api/admin/sponsors/seed-demo
     Seed demo sponsors (for testing)
     ═══════════════════════════════════════════ */
  static async seedDemoSponsors(req: Request, res: Response): Promise<void> {
    try {
      const demoSponsors = [
        {
          id: 'spon_nike_001',
          brandName: 'Nike Basketball',
          companyName: 'Nike Inc.',
          logoUrl:
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&auto=format&fit=crop&q=80',
          category: 'apparel',
          sponsorTier: 'title',
          targetSports: ['basketball'],
          placementLocations: ['dashboard', 'tournaments', 'leaderboard'],
          headline: 'Official Court Footwear Partner',
          description:
            'Exclusive 20% off Nike basketball gear for verified Playground League athletes.',
          ctaText: 'Claim Nike Perk',
          ctaLink: 'https://nike.com',
          discountCode: 'PLAYGROUND20',
          xpReward: 50,
          status: 'active',
          contactEmail: 'partners@nike.com',
        },
        {
          id: 'spon_gatorade_001',
          brandName: 'Gatorade',
          companyName: 'PepsiCo',
          logoUrl:
            'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&auto=format&fit=crop&q=80',
          category: 'beverage',
          sponsorTier: 'gold',
          targetSports: ['all'],
          placementLocations: ['dashboard', 'social_feed'],
          headline: 'Hydration & Fuel Partner',
          description:
            'Free sports drink vouchers after every 5 games played this season.',
          ctaText: 'Get Fuel Voucher',
          ctaLink: 'https://gatorade.com',
          discountCode: 'FUEL5',
          xpReward: 25,
          status: 'active',
          contactEmail: 'partners@gatorade.com',
        },
        {
          id: 'spon_wilson_001',
          brandName: 'Wilson',
          companyName: 'Wilson Sporting Goods',
          logoUrl:
            'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=150&auto=format&fit=crop&q=80',
          category: 'gear',
          sponsorTier: 'silver',
          targetSports: ['basketball', 'volleyball'],
          placementLocations: ['tournaments'],
          headline: 'Official Game Ball Provider',
          description:
            'Tournament-grade basketballs and volleyballs with exclusive athlete pricing.',
          ctaText: 'Shop Wilson',
          ctaLink: 'https://wilson.com',
          discountCode: 'WILSON10',
          xpReward: 20,
          status: 'active',
          contactEmail: 'partners@wilson.com',
        },
        {
          id: 'spon_d1scout_001',
          brandName: 'D1 Scout Network',
          companyName: 'D1 Athletics LLC',
          logoUrl:
            'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80',
          category: 'scouting',
          sponsorTier: 'gold',
          targetSports: ['basketball'],
          placementLocations: ['scouts', 'dashboard'],
          headline: 'College Recruiting Exposure',
          description:
            'Get scouted by 200+ D1 & D2 college coaches with verified highlight reels.',
          ctaText: 'Get Scouted',
          ctaLink: 'https://d1scout.com',
          discountCode: 'D1FREE',
          xpReward: 100,
          status: 'active',
          contactEmail: 'scouts@d1network.com',
        },
      ];

      // Insert each (skip if exists)
      let inserted = 0;
      for (const s of demoSponsors) {
        const [existing] = await pool.execute<any[]>(
          `SELECT id FROM sponsors WHERE id = ?`,
          [s.id]
        );
        if (existing.length === 0) {
          await pool.execute(
            `INSERT INTO sponsors 
             (id, brand_name, company_name, logo_url, category, sponsor_tier, 
              target_sports, placement_locations, headline, description, cta_text, cta_link, 
              discount_code, xp_reward, status, contact_email)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.id,
              s.brandName,
              s.companyName,
              s.logoUrl,
              s.category,
              s.sponsorTier,
              JSON.stringify(s.targetSports),
              JSON.stringify(s.placementLocations),
              s.headline,
              s.description,
              s.ctaText,
              s.ctaLink,
              s.discountCode,
              s.xpReward,
              s.status,
              s.contactEmail,
            ]
          );
          inserted++;
        }
      }

      res.status(200).json({
        success: true,
        message: `Seeded ${inserted} demo sponsor(s)`,
        data: { inserted },
      });
    } catch (err: any) {
      console.error('❌ Seed sponsors error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to seed sponsors',
      });
    }
  }
}