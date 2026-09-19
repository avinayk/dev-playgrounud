// controllers/athlete.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AthleteService, computeLevelInfo } from '../services/athlete.service';
import pool from '../config/database';
const athleteService = new AthleteService();

// ✅ Make sure this is exported
export class AthleteController {
    // Get all athletes
    async getAllAthletes(req: Request, res: Response): Promise<void> {
        try {
            const athletes = await athleteService.getAllAthletes();
            res.status(200).json({
                success: true,
                data: athletes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athletes',
                error: (error as Error).message
            });
        }
    }



    async awardXp(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body as { amount?: number; reason?: string };

    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, message: 'amount must be a positive number' });
      return;
    }

    // 1. Load current XP + level info
    const [rows] = await pool.query<any[]>(
      'SELECT valuexp, level FROM athletes WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      res.status(404).json({ success: false, message: 'Athlete not found' });
      return;
    }

    const currentXp = Number(rows[0].valuexp ?? 0);
    const newTotal  = currentXp + amount;

    // 2. Recompute leveling (mirror getLevelInfo from frontend)
    const levelInfo = computeLevelInfo(newTotal);

    // 3. Persist everything
    await pool.execute(
      `UPDATE athletes
         SET valuexp = ?,
             level = ?,
             levelTitle = ?,
             xpInCurrentLevel = ?,
             xpRequiredForNextLevel = ?,
             isMaxLevel = ?
       WHERE id = ?`,
      [
        newTotal,
        levelInfo.level,
        levelInfo.levelTitle,
        levelInfo.xpInCurrentLevel,
        levelInfo.xpRequiredForNextLevel,
        levelInfo.isMaxLevel ? 1 : 0,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      valuexp: newTotal,
      level: levelInfo.level,
      levelTitle: levelInfo.levelTitle,
    });
  } catch (err) {
    console.error('❌ awardXp:', err);
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Server error',
    });
  }
}




    // Get athlete by ID
    async getAthleteById(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id;
            const athlete = await athleteService.getAthleteById(id);
            
            if (!athlete) {
                res.status(404).json({
                    success: false,
                    message: 'Athlete not found'
                });
                return;
            }
            
            res.status(200).json({
                success: true,
                data: athlete
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athlete',
                error: (error as Error).message
            });
        }
    }

    // Get athlete by email
    async getAthleteByEmail(req: Request, res: Response): Promise<void> {
        try {
            const email = req.params.email;
            const athlete = await athleteService.getAthleteByEmail(email);
            
            if (!athlete) {
                res.status(404).json({
                    success: false,
                    message: 'Athlete not found'
                });
                return;
            }
            
            res.status(200).json({
                success: true,
                data: athlete
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athlete',
                error: (error as Error).message
            });
        }
    }

    // Get athlete by handle
    async getAthleteByHandle(req: Request, res: Response): Promise<void> {
        try {
            const handle = req.params.handle;
            const athlete = await athleteService.getAthleteByHandle(handle);
            
            if (!athlete) {
                res.status(404).json({
                    success: false,
                    message: 'Athlete not found'
                });
                return;
            }
            
            res.status(200).json({
                success: true,
                data: athlete
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athlete',
                error: (error as Error).message
            });
        }
    }

    // Create athlete
    async createAthlete(req: Request, res: Response): Promise<void> {
        try {
            const athleteData = req.body;

            // ── Basic validation ───────────────────────────────────
            if (!athleteData.name || !athleteData.email || !athleteData.handle || !athleteData.password) {
                res.status(400).json({
                    success: false,
                    message: 'Name, email, handle, and password are required',
                });
                return;
            }

            if (athleteData.password.length < 6) {
                res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long',
                });
                return;
            }

            // ── Duplicate checks ───────────────────────────────────
            const existingAthlete = await athleteService.getAthleteByEmail(athleteData.email);
            if (existingAthlete) {
                res.status(409).json({
                    success: false,
                    message: 'An athlete with this email already exists',
                });
                return;
            }

            const existingHandle = await athleteService.getAthleteByHandle(athleteData.handle);
            if (existingHandle) {
                res.status(409).json({
                    success: false,
                    message: 'This handle is already taken',
                });
                return;
            }

            // ── ✅ Hash password HERE (single source of truth) ─────
            const hashedPassword = await bcrypt.hash(athleteData.password, 10);

            // ── ✅ Pass referredByCode through ─────────────────────
            const athlete = await athleteService.createAthlete({
                ...athleteData,
                password: hashedPassword,
                referredByCode: athleteData.referredByCode || undefined,
            });

            res.status(201).json({
                success: true,
                data: athlete,
                referred: !!athleteData.referredByCode,
                message: 'Athlete created successfully',
            });
        } catch (error) {
            console.error('❌ ERROR in createAthlete:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating athlete',
                error: (error as Error).message,
            });
        }
    }
    // GET /api/athletes/:id/referral-code
    async getReferralCode(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const code = await athleteService.getReferralCode(id);

            if (!code) {
                res.status(404).json({ success: false, message: 'Athlete not found' });
                return;
            }

            res.json({ success: true, referralCode: code });
        } catch (err) {
            console.error('❌ getReferralCode:', err);
            res.status(500).json({
                success: false,
                message: err instanceof Error ? err.message : 'Server error',
            });
        }
    }


    async logReferralInvite(req: Request, res: Response): Promise<void> {
  try {
    const { athleteId, email, link } = req.body;

    if (!athleteId || !email || !link) {
      res.status(400).json({
        success: false,
        message: 'athleteId, email, and link are required',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
      return;
    }

    const result = await athleteService.logReferralInvite(
      athleteId,
      email,
      link
    );

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ logReferralInvite:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
}

    // GET /api/athletes/:id/referrals/stats
    async getReferralStats(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const stats = await athleteService.getReferralStats(id);

            if (!stats) {
                res.status(404).json({ success: false, message: 'Athlete not found' });
                return;
            }

            // Frontend ReferralModal expects: { sent, joined, earned, ... }
            res.json(stats);
        } catch (err) {
            console.error('❌ getReferralStats:', err);
            res.status(500).json({
                success: false,
                message: err instanceof Error ? err.message : 'Server error',
            });
        }
    }

    // GET /api/athletes/:id/referrals/history
    async getReferralHistory(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const history = await athleteService.getReferralHistory(id);
            res.json({ success: true, data: history });
        } catch (err) {
            console.error('❌ getReferralHistory:', err);
            res.status(500).json({
                success: false,
                message: err instanceof Error ? err.message : 'Server error',
            });
        }
    }

    // Update athlete
    async updateAthlete(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id;
            
            // Check if athlete exists
            const existingAthlete = await athleteService.getAthleteById(id);
            if (!existingAthlete) {
                res.status(404).json({
                    success: false,
                    message: 'Athlete not found'
                });
                return;
            }

            // If email is being updated, check if it's already taken
            if (req.body.email) {
                const athleteWithEmail = await athleteService.getAthleteByEmail(req.body.email);
                if (athleteWithEmail && athleteWithEmail.id !== id) {
                    res.status(409).json({
                        success: false,
                        message: 'This email is already taken by another athlete'
                    });
                    return;
                }
            }

            // If handle is being updated, check if it's already taken
            if (req.body.handle) {
                const athleteWithHandle = await athleteService.getAthleteByHandle(req.body.handle);
                if (athleteWithHandle && athleteWithHandle.id !== id) {
                    res.status(409).json({
                        success: false,
                        message: 'This handle is already taken'
                    });
                    return;
                }
            }

            const athlete = await athleteService.updateAthlete(id, req.body);
            
            res.status(200).json({
                success: true,
                data: athlete,
                message: 'Athlete updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating athlete',
                error: (error as Error).message
            });
        }
    }

    // Delete athlete
    async deleteAthlete(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id;
            const deleted = await athleteService.deleteAthlete(id);
            
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: 'Athlete not found'
                });
                return;
            }
            
            res.status(200).json({
                success: true,
                message: 'Athlete deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting athlete',
                error: (error as Error).message
            });
        }
    }

    // Search athletes
    async searchAthletes(req: Request, res: Response): Promise<void> {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Search query parameter "q" is required'
                });
                return;
            }
            
            const athletes = await athleteService.searchAthletes(q);
            res.status(200).json({
                success: true,
                data: athletes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error searching athletes',
                error: (error as Error).message
            });
        }
    }

    // Get athletes by sport
    async getAthletesBySport(req: Request, res: Response): Promise<void> {
        try {
            const { sport } = req.params;
            const athletes = await athleteService.getAthletesBySport(sport);
            res.status(200).json({
                success: true,
                data: athletes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athletes by sport',
                error: (error as Error).message
            });
        }
    }

    // Get scouts
    async getScouts(req: Request, res: Response): Promise<void> {
        try {
            const scouts = await athleteService.getScouts();
            res.status(200).json({
                success: true,
                data: scouts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching scouts',
                error: (error as Error).message
            });
        }
    }

    // Get athletes by state
    async getAthletesByState(req: Request, res: Response): Promise<void> {
        try {
            const { state } = req.params;
            const athletes = await athleteService.getAthletesByState(state);
            res.status(200).json({
                success: true,
                data: athletes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athletes by state',
                error: (error as Error).message
            });
        }
    }

    // Get athletes by city
    async getAthletesByCity(req: Request, res: Response): Promise<void> {
        try {
            const { city } = req.params;
            const athletes = await athleteService.getAthletesByCity(city);
            res.status(200).json({
                success: true,
                data: athletes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athletes by city',
                error: (error as Error).message
            });
        }
    }

    // Get verified athletes
    async getVerifiedAthletes(req: Request, res: Response): Promise<void> {
        try {
            const athletes = await athleteService.getVerifiedAthletes();
            res.status(200).json({
                success: true,
                data: athletes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching verified athletes',
                error: (error as Error).message
            });
        }
    }

    // Get athlete stats
    async getAthleteStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await athleteService.getAthleteStats();
            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching athlete stats',
                error: (error as Error).message
            });
        }
    }

    async listAthletes(req: Request, res: Response): Promise<void> {
        try {
            const excludeId = String(req.query.excludeId ?? '');
            const query = String(req.query.q ?? '').trim();
 
            // if (!excludeId) {
            // res.status(400).json({ success: false, message: 'excludeId required' });
            // return;
            // }
 
            const athletes = query
            ? await AthleteService.searchAthletes(excludeId, query)
            : await AthleteService.listAllExcept(excludeId);
 
            res.json({ success: true, data: athletes });
        } catch (err) {
            console.error('❌ listAthletes:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
        const { athleteId, lat, lng } = req.body;
 
        if (!athleteId || typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(400).json({
            success: false,
            message: 'athleteId, lat, lng required (numbers)'
        });
        return;
        }
 
        // Validate range
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        res.status(400).json({
            success: false,
            message: 'Invalid coordinates'
        });
        return;
        }
 
        await pool.execute(
        `UPDATE athletes SET lat = ?, lng = ?, updated_at = NOW() WHERE id = ?`,
        [lat, lng, athleteId]
        );
 
        res.json({ success: true, message: 'Location updated' });
    } catch (err) {
        console.error('❌ updateLocation:', err);
        res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Server error'
        });
    }
    }

    async getMatchHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const sport = (req.query.sport as string) || 'all';
    const range = (req.query.range as string) || 'all';

    // Convert range to days
    let days = 0;
    if (range === 'week') days = 7;
    else if (range === 'month') days = 30;
    else if (range === '90days') days = 90;

    const matches = await athleteService.getMatchHistory(id, sport, days);

    res.json({ success: true, data: matches });
  } catch (err: any) {
    console.error('❌ getMatchHistory:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}
 
    
}