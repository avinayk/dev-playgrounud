// services/stat.service.ts

import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface StatLogData {
    sport: string;
    outcome: 'win' | 'loss';
    created_by_id?: string;  // UUID string
    // Basketball stats
    points?: number;
    assists?: number;
    rebounds?: number;
    threePtMade?: number;
    steals?: number;
    blocks?: number;
    // Baseball stats
    baseHits?: number;
    atBats?: number;
    rbis?: number;
    homeRuns?: number;
    // Softball stats
    softballHits?: number;
    softballAtBats?: number;
    softballRbis?: number;
    stolenBases?: number;
    // Pickleball stats
    kitchenDinks?: number;
    acesServed?: number;
    // Soccer stats
    goalsScored?: number;
    soccerAssists?: number;
    // Volleyball stats
    spikeKills?: number;
    serviceAces?: number;
    netBlocks?: number;
    groundDigs?: number;
    settingAssists?: number;
    // Football stats
    passingYards?: number;
    touchdowns?: number;
    // Tennis stats
    tennisAcesServed?: number;
    breakPointsWon?: number;
}

export interface StatFilters {
    sport?: string;
    outcome?: 'win' | 'loss';
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export class StatService {
    // Create a new stat log
    async createStatLog(data: StatLogData): Promise<{ id: number }> {
        try {
            const athleteId = data.created_by_id;

            if (!athleteId || typeof athleteId !== 'string' || athleteId.trim() === '') {
                throw new Error('Valid Athlete ID (created_by_id) is required');
            }

            // Verify the athlete exists (UUID string)
            await this.verifyAthleteExists(athleteId);

            const { query, values } = this.buildInsertQuery({
                ...data,
                athleteId: athleteId
            });

            console.log('Executing query:', query);
            console.log('With values:', values);

            const [result] = await pool.execute<ResultSetHeader>(query, values);
            return { id: result.insertId };
        } catch (error) {
            console.error('Error in createStatLog:', error);
            throw error;
        }
    }

    private async verifyAthleteExists(athleteId: string): Promise<void> {
        try {
            const [rows] = await pool.execute<RowDataPacket[]>(
                'SELECT id FROM athletes WHERE id = ?',
                [athleteId]
            );

            if (rows.length === 0) {
                throw new Error(`Athlete with ID ${athleteId} not found`);
            }
        } catch (error: any) {
            console.error('Error verifying athlete:', error);
            throw new Error(`Failed to verify athlete: ${error.message}`);
        }
    }

    // Get stat logs with filters
    async getStatLogs(filters: StatFilters): Promise<any[]> {
        let query = 'SELECT * FROM game_performance_logs WHERE 1=1';
        const values: any[] = [];

        if (filters.sport) {
            query += ' AND sport = ?';
            values.push(filters.sport);
        }

        if (filters.outcome) {
            query += ' AND outcome = ?';
            values.push(filters.outcome);
        }

        if (filters.startDate) {
            query += ' AND created_at >= ?';
            values.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND created_at <= ?';
            values.push(filters.endDate);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        values.push(filters.limit || 50);
        values.push(filters.offset || 0);

        const [rows] = await pool.execute<RowDataPacket[]>(query, values);
        return rows;
    }

    // Get stats for a specific athlete (UUID)
    async getAthleteStats(athleteId: string, options?: { sport?: string; limit?: number }): Promise<any[]> {
        let query = 'SELECT * FROM game_performance_logs WHERE created_by_id = ?';
        const values: any[] = [athleteId];

        if (options?.sport) {
            query += ' AND sport = ?';
            values.push(options.sport);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        values.push(options?.limit || 20);

        const [rows] = await pool.execute<RowDataPacket[]>(query, values);
        return rows;
    }

    // Get summary statistics
    async getStatsSummary(options?: { athleteId?: string; sport?: string }): Promise<any> {
        let query = `
            SELECT 
                COUNT(*) as total_games,
                SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as total_wins,
                SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as total_losses,
                ROUND(SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as win_percentage
        `;

        const values: any[] = [];

        if (options?.sport) {
            query += `,
                AVG(points) as avg_points,
                AVG(assists) as avg_assists,
                AVG(rebounds) as avg_rebounds,
                AVG(spike_kills) as avg_spike_kills,
                AVG(base_hits) as avg_base_hits
            `;
        }

        query += ' FROM game_performance_logs WHERE 1=1';

        if (options?.athleteId) {
            query += ' AND created_by_id = ?';
            values.push(options.athleteId);
        }

        if (options?.sport) {
            query += ' AND sport = ?';
            values.push(options.sport);
        }

        const [rows] = await pool.execute<RowDataPacket[]>(query, values);
        return rows[0] || {};
    }

    // Get win/loss ratio
    async getWinLossRatio(options?: { athleteId?: string; sport?: string }): Promise<any> {
        let query = `
            SELECT 
                sport,
                COUNT(*) as total_games,
                SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
                ROUND(SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as win_percentage
            FROM game_performance_logs
            WHERE 1=1
        `;

        const values: any[] = [];

        if (options?.athleteId) {
            query += ' AND created_by_id = ?';
            values.push(options.athleteId);
        }

        if (options?.sport) {
            query += ' AND sport = ?';
            values.push(options.sport);
        }

        query += ' GROUP BY sport ORDER BY win_percentage DESC';

        const [rows] = await pool.execute<RowDataPacket[]>(query, values);
        return rows;
    }

    // Delete a stat log
    async deleteStatLog(id: number): Promise<void> {
        const query = 'DELETE FROM game_performance_logs WHERE id = ?';
        await pool.execute(query, [id]);
    }

    // Private helper to build insert query
    private buildInsertQuery(data: StatLogData & { athleteId: string }): { query: string; values: any[] } {
        const columns = ['sport', 'outcome', 'created_by_id'];
        const placeholders = ['?', '?', '?'];
        const values: any[] = [data.sport, data.outcome, data.athleteId];

        switch (data.sport) {
            case 'basketball':
                columns.push('points', 'assists', 'rebounds', 'three_pt_made', 'steals', 'blocks');
                placeholders.push('?', '?', '?', '?', '?', '?');
                values.push(
                    data.points || 0,
                    data.assists || 0,
                    data.rebounds || 0,
                    data.threePtMade || 0,
                    data.steals || 0,
                    data.blocks || 0
                );
                break;

            case 'baseball':
                columns.push('base_hits', 'at_bats', 'rbis', 'home_runs');
                placeholders.push('?', '?', '?', '?');
                values.push(
                    data.baseHits || 0,
                    data.atBats || 0,
                    data.rbis || 0,
                    data.homeRuns || 0
                );
                break;

            case 'softball':
                columns.push('softball_hits', 'softball_at_bats', 'softball_rbis', 'stolen_bases');
                placeholders.push('?', '?', '?', '?');
                values.push(
                    data.softballHits || 0,
                    data.softballAtBats || 0,
                    data.softballRbis || 0,
                    data.stolenBases || 0
                );
                break;

            case 'pickleball':
                columns.push('kitchen_dinks', 'aces_served');
                placeholders.push('?', '?');
                values.push(
                    data.kitchenDinks || 0,
                    data.acesServed || 0
                );
                break;

            case 'soccer':
                columns.push('goals_scored', 'soccer_assists');
                placeholders.push('?', '?');
                values.push(
                    data.goalsScored || 0,
                    data.soccerAssists || 0
                );
                break;

            case 'volleyball':
                columns.push('spike_kills', 'service_aces', 'net_blocks', 'ground_digs', 'setting_assists');
                placeholders.push('?', '?', '?', '?', '?');
                values.push(
                    data.spikeKills || 0,
                    data.serviceAces || 0,
                    data.netBlocks || 0,
                    data.groundDigs || 0,
                    data.settingAssists || 0
                );
                break;

            case 'football':
                columns.push('passing_yards', 'touchdowns');
                placeholders.push('?', '?');
                values.push(
                    data.passingYards || 0,
                    data.touchdowns || 0
                );
                break;

            case 'tennis':
                columns.push('tennis_aces_served', 'break_points_won');
                placeholders.push('?', '?');
                values.push(
                    data.tennisAcesServed || 0,
                    data.breakPointsWon || 0
                );
                break;

            default:
                throw new Error(`Unsupported sport: ${data.sport}`);
        }

        // Add created_at
        columns.push('created_at');
        placeholders.push('NOW()');

        const query = `INSERT INTO game_performance_logs (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
        return { query, values };
    }
}