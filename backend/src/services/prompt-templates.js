/**
 * Prompt Templates Service
 * Provides predefined prompts for paper Q&A in different categories
 */

class PromptTemplatesService {
  constructor() {
    this.templates = this.initializeTemplates();
    console.log('📝 Prompt Templates Service initialized');
  }

  /**
   * Initialize prompt template categories
   * @returns {array}
   */
  initializeTemplates() {
    return [
      {
        id: 'methodology',
        label: '方法论分析',
        icon: '🔬',
        description: '深入理解论文的核心方法和创新点',
        prompts: [
          {
            id: 'method-1',
            text: '详细解释这篇论文的核心方法论是什么？',
            description: '获取方法的整体概述'
          },
          {
            id: 'method-2',
            text: '这个方法与现有SOTA方法的主要区别是什么？',
            description: '对比分析'
          },
          {
            id: 'method-3',
            text: '论文方法的创新点具体在哪里？为什么这些创新是重要的？',
            description: '识别关键创新'
          },
          {
            id: 'method-4',
            text: '这个方法的设计动机是什么？它要解决什么具体问题？',
            description: '理解设计思路'
          }
        ]
      },
      {
        id: 'technical',
        label: '技术深度',
        icon: '⚙️',
        description: '探索技术细节、算法和实现',
        prompts: [
          {
            id: 'tech-1',
            text: '请解释论文中的关键数学公式和推导过程',
            description: '数学原理'
          },
          {
            id: 'tech-2',
            text: '这个算法的时间复杂度和空间复杂度是多少？',
            description: '复杂度分析'
          },
          {
            id: 'tech-3',
            text: '实现这个方法需要注意哪些技术细节和潜在挑战？',
            description: '实现指导'
          },
          {
            id: 'tech-4',
            text: '论文使用了哪些关键技术或工具？为什么选择它们？',
            description: '技术栈分析'
          }
        ]
      },
      {
        id: 'experiments',
        label: '实验分析',
        icon: '📊',
        description: '评估实验设计、结果和有效性',
        prompts: [
          {
            id: 'exp-1',
            text: '实验设置是否合理？使用了哪些数据集和评估指标？',
            description: '实验设计评估'
          },
          {
            id: 'exp-2',
            text: '实验结果的统计显著性如何？是否有充分的证据支持结论？',
            description: '结果可信度'
          },
          {
            id: 'exp-3',
            text: '消融实验说明了什么？各个组件的贡献是什么？',
            description: '组件分析'
          },
          {
            id: 'exp-4',
            text: '在不同数据集或场景下，方法的表现如何？有什么规律？',
            description: '泛化能力'
          }
        ]
      },
      {
        id: 'applications',
        label: '应用与影响',
        icon: '🚀',
        description: '理解实际应用和潜在影响',
        prompts: [
          {
            id: 'app-1',
            text: '这项研究有哪些实际应用场景？',
            description: '应用场景'
          },
          {
            id: 'app-2',
            text: '这个方法对相关领域可能产生什么影响？',
            description: '领域影响'
          },
          {
            id: 'app-3',
            text: '如果要在工业界部署这个方法，需要考虑什么？',
            description: '工程化思考'
          },
          {
            id: 'app-4',
            text: '基于这项研究，未来可能的研究方向有哪些？',
            description: '未来展望'
          }
        ]
      },
      {
        id: 'critical',
        label: '批判性思考',
        icon: '🤔',
        description: '识别局限性和改进空间',
        prompts: [
          {
            id: 'crit-1',
            text: '这篇论文的主要局限性是什么？',
            description: '识别弱点'
          },
          {
            id: 'crit-2',
            text: '实验中有哪些潜在的问题或bias？',
            description: '实验批判'
          },
          {
            id: 'crit-3',
            text: '这个方法可能在哪些情况下失效？为什么？',
            description: '失效场景'
          },
          {
            id: 'crit-4',
            text: '如果要改进这个方法，你会从哪些方面入手？',
            description: '改进建议'
          }
        ]
      }
    ];
  }

  /**
   * Get all prompt categories
   * @returns {array}
   */
  getAllCategories() {
    return this.templates;
  }

  /**
   * Get prompts by category ID
   * @param {string} categoryId
   * @returns {object|null}
   */
  getCategoryById(categoryId) {
    return this.templates.find(cat => cat.id === categoryId) || null;
  }

  /**
   * Get specific prompt by IDs
   * @param {string} categoryId
   * @param {string} promptId
   * @returns {object|null}
   */
  getPromptById(categoryId, promptId) {
    const category = this.getCategoryById(categoryId);
    if (!category) return null;

    return category.prompts.find(p => p.id === promptId) || null;
  }

  /**
   * Get all prompts flattened
   * @returns {array}
   */
  getAllPrompts() {
    const allPrompts = [];
    this.templates.forEach(category => {
      category.prompts.forEach(prompt => {
        allPrompts.push({
          ...prompt,
          categoryId: category.id,
          categoryLabel: category.label,
          categoryIcon: category.icon
        });
      });
    });
    return allPrompts;
  }

  /**
   * Search prompts by keyword
   * @param {string} keyword
   * @returns {array}
   */
  searchPrompts(keyword) {
    if (!keyword || keyword.trim() === '') {
      return this.getAllPrompts();
    }

    const lowerKeyword = keyword.toLowerCase();
    const results = [];

    this.templates.forEach(category => {
      category.prompts.forEach(prompt => {
        if (
          prompt.text.toLowerCase().includes(lowerKeyword) ||
          prompt.description.toLowerCase().includes(lowerKeyword) ||
          category.label.toLowerCase().includes(lowerKeyword)
        ) {
          results.push({
            ...prompt,
            categoryId: category.id,
            categoryLabel: category.label,
            categoryIcon: category.icon
          });
        }
      });
    });

    return results;
  }

  /**
   * Get random prompts from different categories
   * @param {number} count
   * @returns {array}
   */
  getRandomPrompts(count = 3) {
    const allPrompts = this.getAllPrompts();
    const shuffled = allPrompts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    const totalCategories = this.templates.length;
    const totalPrompts = this.getAllPrompts().length;
    const promptsPerCategory = this.templates.map(cat => ({
      category: cat.label,
      count: cat.prompts.length
    }));

    return {
      totalCategories,
      totalPrompts,
      promptsPerCategory,
      avgPromptsPerCategory: (totalPrompts / totalCategories).toFixed(2)
    };
  }
}

module.exports = new PromptTemplatesService();
