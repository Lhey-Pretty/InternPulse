import api from './client';

/**
 * Journal Classification API
 * ML-powered analysis of student journal entries
 */
export const journalClassificationApi = {
  /**
   * Get all companies with journal classification statistics
   * @param {string} filter - 'all' | 'flagged' | 'needs_review'
   */
  getCompanyStats: (filter = 'all') => 
    api.get('/coordinator/journal-classification', { params: { filter } }),

  /**
   * Get detailed journal entries for a specific company
   * @param {number} companyId - Company ID
   * @param {string} level - 'all' | 'unrelated' | 'warning' | 'normal'
   * @param {number} page - Page number for pagination
   */
  getCompanyJournals: (companyId, level = 'all', page = 1) => 
    api.get(`/coordinator/journal-classification/${companyId}`, {
      params: { level, page, per_page: 10 }
    }),

  /**
   * Get journal classification stats for a specific company
   * Used in company detail page sidebar
   * @param {number} companyId - Company ID
   */
  getCompanyJournalStats: (companyId) => 
    api.get(`/coordinator/companies/${companyId}/journal-stats`),

  /**
   * Get global classification statistics
   * @param {number|null} placementId - Optional placement filter
   * @param {number|null} companyId - Optional company filter
   */
  getStatistics: (placementId = null, companyId = null) => 
    api.get('/journal-classification/statistics', {
      params: { 
        placement_id: placementId, 
        company_id: companyId 
      }
    }),
};
