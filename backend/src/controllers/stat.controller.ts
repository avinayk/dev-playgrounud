// controllers/stat.controller.ts
import { Request, Response } from 'express';
import { StatService } from '../services/stat.service';

export class StatController {
    private statService: StatService;

    constructor() {
        this.statService = new StatService();
    }

    // Create a new stat log
    createStatLog = async (req: Request, res: Response) => {
        try {
            const statData = req.body;
            console.log('[createStatLog] Received body:', statData);

            // Validate required fields
            if (!statData.sport || !statData.outcome) {
                return res.status(400).json({
                    success: false,
                    error: 'Sport and outcome are required'
                });
            }

            // created_by_id is now a UUID string
            if (!statData.created_by_id || typeof statData.created_by_id !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Athlete ID (created_by_id) is required as a string'
                });
            }

            const result = await this.statService.createStatLog(statData);

            
            res.status(201).json({
                success: true,
                data: result,
                message: 'Stats logged successfully! +200 XP earned! 🎉'
            });
        } catch (error: any) {
            console.error('Error creating stat log:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to save stats',
                details: error.stack
            });
        }
    };

    // Get all stat logs with optional filters
    getStatLogs = async (req: Request, res: Response) => {
        try {
            console.log(req.query);
            const { sport, outcome, startDate, endDate, limit, offset } = req.query;
            
            const filters = {
                sport: sport as string,
                outcome: outcome as 'win' | 'loss',
                startDate: startDate as string,
                endDate: endDate as string,
                limit: limit ? parseInt(limit as string) : 50,
                offset: offset ? parseInt(offset as string) : 0
            };

            const result = await this.statService.getStatLogs(filters);
            
            res.status(200).json({
                success: true,
                data: result,
                message: 'Stat logs retrieved successfully'
            });
        } catch (error: any) {
            console.error('Error fetching stat logs:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch stat logs'
            });
        }
    };

    // Get stat logs for a specific athlete (UUID)
    getAthleteStats = async (req: Request, res: Response) => {
        try {
            const { athleteId } = req.params; // UUID string
            const { sport, limit } = req.query;

            const result = await this.statService.getAthleteStats(
                athleteId, // pass as string
                {
                    sport: sport as string,
                    limit: limit ? parseInt(limit as string) : 20
                }
            );

            res.status(200).json({
                success: true,
                data: result,
                message: 'Athlete stats retrieved successfully'
            });
        } catch (error: any) {
            console.error('Error fetching athlete stats:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch athlete stats'
            });
        }
    };

    // Get summary statistics
    getStatsSummary = async (req: Request, res: Response) => {
        try {
            const { athleteId, sport } = req.query;

            const result = await this.statService.getStatsSummary({
                athleteId: athleteId ? (athleteId as string) : undefined, // UUID string
                sport: sport as string
            });

            res.status(200).json({
                success: true,
                data: result,
                message: 'Stats summary retrieved successfully'
            });
        } catch (error: any) {
            console.error('Error fetching stats summary:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch stats summary'
            });
        }
    };

    // Get win/loss ratio
    getWinLossRatio = async (req: Request, res: Response) => {
        try {
            const { athleteId, sport } = req.query;

            const result = await this.statService.getWinLossRatio({
                athleteId: athleteId ? (athleteId as string) : undefined, // UUID string
                sport: sport as string
            });

            res.status(200).json({
                success: true,
                data: result,
                message: 'Win/loss ratio retrieved successfully'
            });
        } catch (error: any) {
            console.error('Error fetching win/loss ratio:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch win/loss ratio'
            });
        }
    };

    // Delete a stat log
    deleteStatLog = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            
            await this.statService.deleteStatLog(parseInt(id));
            
            res.status(200).json({
                success: true,
                message: 'Stat log deleted successfully'
            });
        } catch (error: any) {
            console.error('Error deleting stat log:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete stat log'
            });
        }
    };
}