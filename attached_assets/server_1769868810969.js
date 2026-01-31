const express = require('express');
const cors = require('cors');
const path = require('path');
const googleTrends = require('google-trends-api');
const ViralContentAnalyzer = require('./lib/viral-analyzer');
const { db } = require('./server/db');
const { viralContent, socialPosts, thumbnails } = require('./shared/schema');
const { desc, eq, sql, inArray } = require('drizzle-orm');
const { setupAuth, requireAuth, requireAdmin, validateUser, updatePassword, resetPassword, addToWhitelist, removeFromWhitelist, getWhitelist, isAdmin, ADMIN_EMAIL } = require('./lib/auth');

// Import thumbnail generators - using CommonJS require()
let generateAIThumbnail, analyzeContentForThumbnail, createFallbackThumbnail;
let generateTemplateThumbnail, getAvailableTemplates;
let generateVeo3Thumbnail, checkFFmpegAvailability, generateStaticFallback;
let generateViralAIThumbnail, generateViralThumbnailVariations;

// Load thumbnail modules
try {
  const geminiModule = require('./lib/gemini-thumbnails.js');
  generateAIThumbnail = geminiModule.generateAIThumbnail;
  analyzeContentForThumbnail = geminiModule.analyzeContentForThumbnail;
  createFallbackThumbnail = geminiModule.createFallbackThumbnail;
  
  console.log('✅ Gemini thumbnail generator loaded successfully');
} catch (error) {
  console.log('⚠️ Gemini thumbnails not available:', error.message);
}

// Load DALL-E viral thumbnail generator
try {
  const dalleModule = require('./lib/dalle-thumbnails.js');
  generateViralAIThumbnail = dalleModule.generateViralAIThumbnail;
  generateViralThumbnailVariations = dalleModule.generateViralThumbnailVariations;
  
  console.log('✅ DALL-E 3 viral thumbnail generator loaded successfully');
} catch (error) {
  console.log('⚠️ DALL-E thumbnails not available:', error.message);
}

// Try to load optional modules (remotion, veo3) - these may not be needed
try {
  const remotionModule = require('./lib/remotion-thumbnails.js');
  generateTemplateThumbnail = remotionModule.generateTemplateThumbnail;
  getAvailableTemplates = remotionModule.getAvailableTemplates;
  console.log('✅ Remotion thumbnail generator loaded');
} catch (error) {
  console.log('ℹ️ Remotion thumbnails not available (optional)');
}

try {
  const veo3Module = require('./lib/veo3-thumbnails.js');
  generateVeo3Thumbnail = veo3Module.generateVeo3Thumbnail;
  checkFFmpegAvailability = veo3Module.checkFFmpegAvailability;
  generateStaticFallback = veo3Module.generateStaticFallback;
  console.log('✅ Veo3 thumbnail generator loaded');
} catch (error) {
  console.log('ℹ️ Veo3 thumbnails not available (optional)');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Viral Content Analyzer
const viralAnalyzer = new ViralContentAnalyzer();

// Middleware
app.use(cors());
app.use(express.json());

// Setup authentication (sessions)
setupAuth(app);

// Auth routes (before requireAuth middleware)
app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    const result = await validateUser(email, password);
    
    if (result.success) {
      req.session.user = result.user;
      return res.json({ success: true, user: result.user });
    } else {
      return res.status(401).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/auth/status', async (req, res) => {
  if (req.session && req.session.user) {
    const adminStatus = await isAdmin(req.session.user.email);
    return res.json({ authenticated: true, user: { ...req.session.user, isAdmin: adminStatus } });
  }
  return res.json({ authenticated: false });
});

app.post('/api/auth/change-password', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    const result = await updatePassword(req.session.user.email, newPassword);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email and new password required' });
    }
    
    const result = await resetPassword(email, newPassword);
    
    if (result.success) {
      return res.json({ success: true, message: 'Password reset successfully' });
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ success: false, error: 'Password reset failed' });
  }
});

// Admin routes (before general requireAuth)
app.get('/admin', async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  const adminStatus = await isAdmin(req.session.user.email);
  if (!adminStatus) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/whitelist', requireAdmin, async (req, res) => {
  try {
    const users = await getWhitelist();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch whitelist' });
  }
});

app.post('/api/admin/whitelist', requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    const result = await addToWhitelist(email, req.session.user.email);
    res.json(result);
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    res.status(500).json({ success: false, error: 'Failed to add user' });
  }
});

app.delete('/api/admin/whitelist', requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    const result = await removeFromWhitelist(email);
    res.json(result);
  } catch (error) {
    console.error('Error removing from whitelist:', error);
    res.status(500).json({ success: false, error: 'Failed to remove user' });
  }
});

// Require authentication for all other routes
app.use(requireAuth);

// Static files (after auth middleware)
app.use(express.static(path.join(__dirname, 'public')));

// Cache control headers for Replit environment
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Viral app is running!' });
});

// Check API capabilities
app.get('/api/capabilities', (req, res) => {
  const capabilities = {
    gemini_ai: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    ai_thumbnails: !!process.env.GEMINI_API_KEY,
    ai_content: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY)
  };
  res.json(capabilities);
});

// Google Trends API - Discover viral topics for content generation
app.get('/api/discover-viral-topics', async (req, res) => {
  try {
    console.log('📊 API: Discovering viral topics with Google Trends...');
    
    // Define medicine and money related keywords to search
    const medicalKeywords = [
      'doctor money',
      'physician investment',
      'medical student debt',
      'doctor salary',
      'physician real estate',
      'medical practice finance',
      'doctor retirement',
      'physician wealth building'
    ];
    
    const trendingTopics = [];
    
    // Get trending data for each keyword
    for (const keyword of medicalKeywords) {
      try {
        console.log(`🔍 Checking trends for: ${keyword}`);
        
        // Get interest over time for the keyword
        const trendsData = await googleTrends.interestOverTime({
          keyword: keyword,
          startTime: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)), // Last 30 days
          geo: 'US',
          category: 45 // Health category
        });
        
        // Check if response is HTML error page instead of JSON
        if (typeof trendsData === 'string' && trendsData.trim().startsWith('<')) {
          throw new Error('Google Trends returned HTML error page - likely rate limited or authentication issue');
        }
        
        const parsedData = JSON.parse(trendsData);
        
        if (parsedData?.default?.timelineData?.length > 0) {
          // Calculate average interest and trend direction
          const timelineData = parsedData.default.timelineData;
          const recentValues = timelineData.slice(-7); // Last 7 data points
          const avgInterest = recentValues.reduce((sum, item) => sum + (item.value?.[0] || 0), 0) / recentValues.length;
          
          // Determine if trending up or down
          const firstValue = recentValues[0]?.value?.[0] || 0;
          const lastValue = recentValues[recentValues.length - 1]?.value?.[0] || 0;
          const trendDirection = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable';
          
          trendingTopics.push({
            keyword,
            averageInterest: Math.round(avgInterest),
            trendDirection,
            popularity: avgInterest > 50 ? 'high' : avgInterest > 25 ? 'medium' : 'low',
            contentSuggestion: generateContentSuggestion(keyword, avgInterest, trendDirection)
          });
        }
        
        // Add small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (keywordError) {
        console.warn(`⚠️ Failed to get trends for ${keyword}:`, keywordError.message);
        // Continue with other keywords even if one fails
      }
    }
    
    // If no trends data was retrieved, provide fallback topics
    if (trendingTopics.length === 0) {
      console.log('🔄 No Google Trends data available, using fallback topics...');
      const fallbackTopics = [
        { keyword: 'doctor salary', averageInterest: 75, trendDirection: 'up', popularity: 'high', contentSuggestion: 'Doctor Salary Guide: What You Should Really Be Earning' },
        { keyword: 'physician investment', averageInterest: 68, trendDirection: 'up', popularity: 'high', contentSuggestion: 'Investment Strategies Every Physician Should Know' },
        { keyword: 'medical student debt', averageInterest: 72, trendDirection: 'stable', popularity: 'high', contentSuggestion: 'Crushing Medical School Debt: A Step-by-Step Plan' },
        { keyword: 'doctor retirement', averageInterest: 45, trendDirection: 'up', popularity: 'medium', contentSuggestion: 'Doctor Retirement Planning: Beyond the 401k' },
        { keyword: 'physician real estate', averageInterest: 52, trendDirection: 'up', popularity: 'high', contentSuggestion: 'Real Estate Investing for Busy Doctors' },
        { keyword: 'medical practice finance', averageInterest: 38, trendDirection: 'stable', popularity: 'medium', contentSuggestion: 'Financial Management for Medical Practices' }
      ];
      trendingTopics.push(...fallbackTopics);
    }
    
    // Sort by average interest (highest first)
    trendingTopics.sort((a, b) => b.averageInterest - a.averageInterest);
    
    console.log(`✅ Discovered ${trendingTopics.length} viral topics`);
    
    res.json({
      success: true,
      topics: trendingTopics,
      timestamp: new Date().toISOString(),
      summary: {
        totalTopics: trendingTopics.length,
        highInterest: trendingTopics.filter(t => t.popularity === 'high').length,
        trendingUp: trendingTopics.filter(t => t.trendDirection === 'up').length
      }
    });
    
  } catch (error) {
    console.error('❌ Error discovering viral topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover viral topics',
      details: error.message
    });
  }
});

// Helper function to generate content suggestions based on trends
function generateContentSuggestion(keyword, interest, direction) {
  const suggestions = {
    'doctor money': [
      'Why Most Doctors Stay Poor (And How to Fix It)',
      'Doctor Money Mistakes That Cost Millions',
      'Physician Wealth Building Secrets'
    ],
    'physician investment': [
      'Best Investments for Busy Doctors',
      'Physician Real Estate Investment Guide',
      'Doctor Portfolio Strategies That Work'
    ],
    'medical student debt': [
      'How to Pay Off Medical School Debt Fast',
      'Medical Student Money Management Tips',
      'From Debt to Wealth: Doctor Success Stories'
    ],
    'doctor salary': [
      'Physician Salary Negotiation Secrets',
      'Doctor Income Optimization Strategies',
      'Maximizing Your Medical Practice Income'
    ],
    'physician real estate': [
      'Real Estate Investing for Doctors',
      'Physician Property Investment Guide',
      'How Doctors Build Wealth Through Real Estate'
    ],
    'medical practice finance': [
      'Medical Practice Financial Management',
      'Optimizing Practice Revenue Streams',
      'Financial Planning for Medical Practices'
    ],
    'doctor retirement': [
      'Physician Retirement Planning Guide',
      'Doctor Retirement Mistakes to Avoid',
      'Early Retirement Strategies for Physicians'
    ],
    'physician wealth building': [
      'Wealth Building Strategies for Doctors',
      'How Physicians Create Generational Wealth',
      'Financial Independence for Medical Professionals'
    ]
  };
  
  const keywordSuggestions = suggestions[keyword] || ['Create engaging content about ' + keyword];
  const randomSuggestion = keywordSuggestions[Math.floor(Math.random() * keywordSuggestions.length)];
  
  return {
    title: randomSuggestion,
    urgency: direction === 'up' ? 'high' : interest > 50 ? 'medium' : 'low',
    reason: direction === 'up' ? 'Trending upward - act fast!' : 
            interest > 50 ? 'High interest topic' : 
            'Steady interest - good evergreen content'
  };
}

// Generate viral content endpoint
app.get('/api/generate-viral-content', async (req, res) => {
  try {
    console.log('🚀 API: Generating viral content...');
    
    const platforms = req.query.platforms ? req.query.platforms.split(',') : ['youtube', 'tiktok', 'instagram'];
    const fresh = req.query.fresh === 'true' || req.query.reset;
    const options = { fresh };
    
    if (fresh) {
      console.log('🔄 Fresh content generation requested - clearing cache');
    }
    
    const results = await viralAnalyzer.generateViralContentIdeas(platforms, options);
    
    if (results && results.generated_content) {
      // Save each generated content piece to database
      const savedContent = [];
      for (const content of results.generated_content) {
        try {
          // Extract title and description from the nested generated content structure
          const brandedContent = content.branded_version || {};
          const viralAnalysis = content.viral_analysis || {};
          const originalContent = content.original_content || {};
          
          const title = brandedContent?.title || 
                       content?.title || 
                       originalContent?.title ||
                       originalContent?.caption ||
                       originalContent?.description?.substring(0, 50) ||
                       'Generated Medicine & Money Show Content';
          
          console.log('🔍 Title extraction debug:', {
            brandedContent_title: brandedContent?.title,
            content_title: content?.title,
            original_title: originalContent?.title,
            original_caption: originalContent?.caption,
            final_title: title
          });
          
          const description = brandedContent.description || 
                             content.description || 
                             brandedContent.script?.substring(0, 200) ||
                             originalContent.description ||
                             originalContent.caption ||
                             'AI-generated viral content for Medicine and Money Show';

          // Sanitize text to fix Unicode emoji encoding issues
          const sanitizeText = (text) => {
            if (!text) return text;
            // Replace broken surrogate pairs with empty string or keep valid emojis
            return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, '');
          };

          // Recursively sanitize JSON objects to fix emoji encoding
          const sanitizeJSON = (obj) => {
            if (!obj) return obj;
            if (typeof obj === 'string') {
              return sanitizeText(obj);
            }
            if (Array.isArray(obj)) {
              return obj.map(item => sanitizeJSON(item));
            }
            if (typeof obj === 'object') {
              const sanitized = {};
              for (const key in obj) {
                sanitized[key] = sanitizeJSON(obj[key]);
              }
              return sanitized;
            }
            return obj;
          };

          const [saved] = await db.insert(viralContent).values({
            title: sanitizeText(title),
            description: sanitizeText(description),
            videoType: 'generated',
            platform: content.platform || 'multi-platform',
            originalData: sanitizeJSON(content.original_content),
            generatedContent: sanitizeJSON(content),
            viralityScore: content.viral_analysis?.virality_score || content.virality_score || 85,
            brandVoiceApplied: 'Medicine and Money Show'
          }).returning();
          savedContent.push(saved);
        } catch (dbError) {
          console.error('❌ Database save error:', dbError);
        }
      }
      
      res.json({
        success: true,
        data: results,
        total_generated: results.generated_content.length,
        saved_to_database: savedContent.length
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate viral content'
      });
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trending content from specific platform
app.get('/api/trending/:platform', async (req, res) => {
  // Handle 'all' as a special case
  if (req.params.platform === 'all') {
    try {
      console.log('🔍 API: Fetching all trending searches...');
      
      const [youtube, tiktok, instagram] = await Promise.all([
        viralAnalyzer.fetchYouTubeTrending(),
        viralAnalyzer.fetchTikTokTrending(),
        viralAnalyzer.fetchInstagramTrending()
      ]);

      const allSearches = {
        timestamp: new Date().toISOString(),
        searches: {
          youtube: youtube || [],
          tiktok: tiktok || [],
          instagram: instagram || []
        },
        total_found: (youtube?.length || 0) + (tiktok?.length || 0) + (instagram?.length || 0)
      };

      return res.json({
        success: true,
        data: allSearches,
        message: `Found ${allSearches.total_found} trending searches across all platforms`
      });
    } catch (error) {
      console.error('❌ API Error fetching searches:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  try {
    const platform = req.params.platform.toLowerCase();
    let trendingContent = [];

    switch (platform) {
      case 'youtube':
        trendingContent = await viralAnalyzer.fetchYouTubeTrending();
        break;
      case 'tiktok':
        trendingContent = await viralAnalyzer.fetchTikTokTrending();
        break;
      case 'instagram':
        trendingContent = await viralAnalyzer.fetchInstagramTrending();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid platform. Use youtube, tiktok, or instagram'
        });
    }

    res.json({
      success: true,
      platform,
      data: trendingContent,
      count: trendingContent.length
    });
  } catch (error) {
    console.error(`❌ Error fetching ${req.params.platform} trending:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get previously generated content
app.get('/api/content/history', async (req, res) => {
  try {
    console.log('📚 API: Fetching content history...');
    
    const limit = parseInt(req.query.limit) || 50;
    const { desc } = require('drizzle-orm');
    
    // Add retry logic for database connection issues
    let retries = 3;
    let contentHistory;
    
    while (retries > 0) {
      try {
        contentHistory = await db
          .select()
          .from(viralContent)
          .orderBy(desc(viralContent.createdAt))
          .limit(limit);
        break;
      } catch (dbError) {
        retries--;
        if (retries === 0) throw dbError;
        console.log(`⚠️ Database retry (${3-retries}/3) for content history...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    res.json({
      success: true,
      data: contentHistory,
      total: contentHistory.length
    });
  } catch (error) {
    console.error('❌ API Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content history',
      data: []
    });
  }
});

// Get specific content by ID
app.get('/api/content/:id', async (req, res) => {
  try {
    const { eq } = require('drizzle-orm');
    const id = parseInt(req.params.id);
    
    const [content] = await db
      .select()
      .from(viralContent)
      .where(eq(viralContent.id, id));
    
    if (content) {
      res.json({
        success: true,
        data: content
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }
  } catch (error) {
    console.error('❌ API Error fetching content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate social media posts from viral content (simplified)
app.post('/api/generate-social-posts', async (req, res) => {
  try {
    console.log('📝 API: Generating social media posts...');
    
    const { generatedContent } = req.body;
    
    if (!generatedContent || generatedContent.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No generated content provided'
      });
    }
    
    const socialPostsResults = [];
    const platforms = ['youtube', 'tiktok', 'instagram'];
    
    for (const content of generatedContent) {
      const brandedContent = content.branded_version || content;
      
      for (const platform of platforms) {
        try {
          const socialPost = await viralAnalyzer.generateSocialPost(brandedContent, platform);
          
          if (socialPost) {
            // Save social post to database
            const [savedPost] = await db.insert(socialPosts).values({
              viralContentId: content.id || null,
              platform: platform,
              title: socialPost.title,
              description: socialPost.description,
              script: socialPost.script,
              hashtags: socialPost.hashtags,
              hooks: socialPost.hooks,
              targetLength: socialPost.target_length,
              viralityScore: socialPost.virality_score || 85
            }).returning();
            
            socialPostsResults.push({
              id: savedPost.id,
              platform: platform,
              title: socialPost.title,
              description: socialPost.description,
              script: socialPost.script,
              hashtags: socialPost.hashtags,
              hooks: socialPost.hooks,
              target_length: socialPost.target_length,
              virality_score: socialPost.virality_score || 85,
              created_at: savedPost.createdAt
            });
          }
        } catch (postError) {
          console.error(`❌ Error generating ${platform} post:`, postError);
        }
      }
    }
    
    res.json({
      success: true,
      posts: socialPostsResults,
      total: socialPostsResults.length
    });
    
  } catch (error) {
    console.error('❌ Error generating social posts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate thumbnails for existing social posts
app.post('/api/generate-thumbnails-for-posts', async (req, res) => {
  try {
    console.log('🎨 API: Generating thumbnails for social posts...');
    
    const { postIds, style } = req.body;
    const thumbnailStyle = style || 'professional';
    const thumbnailsResults = [];
    
    if (postIds && postIds.length > 0) {
      // Generate for specific posts
      for (const postId of postIds) {
        const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId));
        
        if (post) {
          try {
            const thumbnail = await viralAnalyzer.generateThumbnail(post, post.platform, thumbnailStyle);
            
            if (thumbnail) {
              // Check if thumbnail already exists for this post
              const existingThumbnail = await db.select().from(thumbnails).where(eq(thumbnails.socialPostId, post.id));
              
              if (existingThumbnail.length > 0) {
                // Update existing thumbnail
                const [updatedThumbnail] = await db
                  .update(thumbnails)
                  .set({
                    imageUrl: thumbnail.image_url,
                    style: thumbnailStyle,
                    prompt: thumbnail.prompt,
                    generationData: thumbnail.generation_data,
                    updatedAt: new Date()
                  })
                  .where(eq(thumbnails.socialPostId, post.id))
                  .returning();
                
                thumbnailsResults.push({
                  id: updatedThumbnail.id,
                  social_post_id: post.id,
                  platform: post.platform,
                  title: thumbnail.title,
                  description: thumbnail.description,
                  style: thumbnailStyle,
                  dimensions: thumbnail.dimensions,
                  image_url: thumbnail.image_url,
                  created_at: updatedThumbnail.createdAt
                });
              } else {
                // Create new thumbnail
                const [savedThumbnail] = await db.insert(thumbnails).values({
                  viralContentId: post.viralContentId,
                  socialPostId: post.id,
                  platform: post.platform,
                  title: thumbnail.title,
                  description: thumbnail.description,
                  style: thumbnailStyle,
                  dimensions: thumbnail.dimensions,
                  imageUrl: thumbnail.image_url,
                  prompt: thumbnail.prompt,
                  generationData: thumbnail.generation_data
                }).returning();
                
                thumbnailsResults.push({
                  id: savedThumbnail.id,
                  social_post_id: post.id,
                  platform: post.platform,
                  title: thumbnail.title,
                  description: thumbnail.description,
                  style: thumbnailStyle,
                  dimensions: thumbnail.dimensions,
                  image_url: thumbnail.image_url,
                  created_at: savedThumbnail.createdAt
                });
              }
            }
          } catch (thumbnailError) {
            console.error(`❌ Error generating thumbnail for post ${postId}:`, thumbnailError);
          }
        }
      }
    } else {
      // Generate for all recent posts without thumbnails
      const recentPosts = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(10);
      
      for (const post of recentPosts) {
        // Check if thumbnail already exists
        const existingThumbnail = await db.select().from(thumbnails).where(eq(thumbnails.socialPostId, post.id));
        
        if (existingThumbnail.length === 0) {
          try {
            const thumbnail = await viralAnalyzer.generateThumbnail(post, post.platform, thumbnailStyle);
            
            if (thumbnail) {
              const [savedThumbnail] = await db.insert(thumbnails).values({
                viralContentId: post.viralContentId,
                socialPostId: post.id,
                platform: post.platform,
                title: thumbnail.title,
                description: thumbnail.description,
                style: thumbnailStyle,
                dimensions: thumbnail.dimensions,
                imageUrl: thumbnail.image_url,
                prompt: thumbnail.prompt,
                generationData: thumbnail.generation_data
              }).returning();
              
              thumbnailsResults.push({
                id: savedThumbnail.id,
                social_post_id: post.id,
                platform: post.platform,
                title: thumbnail.title,
                description: thumbnail.description,
                style: thumbnailStyle,
                dimensions: thumbnail.dimensions,
                image_url: thumbnail.image_url,
                created_at: savedThumbnail.createdAt
              });
            }
          } catch (thumbnailError) {
            console.error(`❌ Error generating thumbnail for post ${post.id}:`, thumbnailError);
          }
        }
      }
    }
    
    res.json({
      success: true,
      thumbnails: thumbnailsResults,
      total: thumbnailsResults.length
    });
    
  } catch (error) {
    console.error('❌ Error generating thumbnails for posts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get saved social posts with thumbnails
app.get('/api/social-posts', async (req, res) => {
  try {
    console.log('📱 API: Fetching saved social posts with thumbnails...');
    
    const savedPosts = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(50);
    
    // Fetch ALL thumbnails for these posts in ONE query using inArray
    const postIds = savedPosts.map(post => post.id);
    const allThumbnails = postIds.length > 0 
      ? await db.select().from(thumbnails).where(inArray(thumbnails.socialPostId, postIds))
      : [];
    
    // Create a map for quick lookup
    const thumbnailMap = new Map();
    allThumbnails.forEach(thumb => {
      if (!thumbnailMap.has(thumb.socialPostId)) {
        thumbnailMap.set(thumb.socialPostId, {
          id: thumb.id,
          image_url: thumb.imageUrl,
          style: thumb.style,
          dimensions: thumb.dimensions,
          created_at: thumb.createdAt
        });
      }
    });
    
    const formattedPosts = savedPosts.map(post => ({
      id: post.id,
      platform: post.platform,
      title: post.title,
      description: post.description,
      script: post.script,
      hashtags: post.hashtags,
      hooks: post.hooks,
      target_length: post.targetLength,
      virality_score: post.viralityScore,
      status: post.status || 'draft',
      approved_by: post.approvedBy,
      posted_at: post.postedAt,
      platform_post_id: post.platformPostId,
      created_at: post.createdAt,
      thumbnail: thumbnailMap.get(post.id) || null
    }));
    
    res.json({
      success: true,
      posts: formattedPosts
    });
    
  } catch (error) {
    console.error('❌ Error fetching social posts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Approval Workflow API Endpoints

// Approve a social post
app.post('/api/social-posts/:id/approve', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { approvedBy } = req.body;
    
    const [updatedPost] = await db
      .update(socialPosts)
      .set({
        status: 'approved',
        approvedBy: approvedBy || 'Admin',
        updatedAt: new Date()
      })
      .where(eq(socialPosts.id, postId))
      .returning();
    
    res.json({
      success: true,
      post: updatedPost,
      message: 'Post approved successfully'
    });
  } catch (error) {
    console.error('❌ Error approving post:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reject a social post
app.post('/api/social-posts/:id/reject', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    const [updatedPost] = await db
      .update(socialPosts)
      .set({
        status: 'rejected',
        updatedAt: new Date()
      })
      .where(eq(socialPosts.id, postId))
      .returning();
    
    res.json({
      success: true,
      post: updatedPost,
      message: 'Post rejected'
    });
  } catch (error) {
    console.error('❌ Error rejecting post:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Post to platform (Instagram, TikTok, YouTube)
app.post('/api/social-posts/:id/post-to-platform', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { platform, accessToken } = req.body;
    
    // Get the post with its thumbnail
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId));
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    if (post.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Post must be approved before posting'
      });
    }
    
    // Get thumbnail for the post
    const postThumbnails = await db.select().from(thumbnails).where(
      eq(thumbnails.socialPostId, post.id)
    );
    
    const thumbnail = postThumbnails.length > 0 ? postThumbnails[0] : null;
    
    // Platform-specific posting (stub - will implement OAuth in next task)
    let platformPostId = null;
    
    if (platform === 'instagram' && accessToken) {
      // Instagram posting will be implemented with OAuth
      platformPostId = `ig_${Date.now()}`;
    } else if (platform === 'tiktok' && accessToken) {
      // TikTok posting will be implemented with OAuth
      platformPostId = `tt_${Date.now()}`;
    } else {
      return res.status(400).json({
        success: false,
        error: `Platform ${platform} posting requires authentication. Please connect your ${platform} account.`
      });
    }
    
    // Update post status to posted
    const [updatedPost] = await db
      .update(socialPosts)
      .set({
        status: 'posted',
        postedAt: new Date(),
        platformPostId: platformPostId,
        updatedAt: new Date()
      })
      .where(eq(socialPosts.id, postId))
      .returning();
    
    res.json({
      success: true,
      post: updatedPost,
      platform_post_id: platformPostId,
      message: `Successfully posted to ${platform}`
    });
    
  } catch (error) {
    console.error('❌ Error posting to platform:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get posts by status
app.get('/api/social-posts/by-status/:status', async (req, res) => {
  try {
    const status = req.params.status;
    
    const filteredPosts = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.status, status))
      .orderBy(desc(socialPosts.createdAt));
    
    res.json({
      success: true,
      posts: filteredPosts,
      count: filteredPosts.length
    });
  } catch (error) {
    console.error('❌ Error fetching posts by status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate viral thumbnails from content
app.post('/api/generate-thumbnails', async (req, res) => {
  try {
    console.log('🎨 API: Generating viral thumbnails...');
    
    const { generatedContent, options } = req.body;
    
    if (!generatedContent || generatedContent.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No generated content provided'
      });
    }
    
    const style = options?.style || 'professional';
    const platformFilter = options?.platform || 'all';
    
    const thumbnailResults = [];
    const platforms = platformFilter === 'all' ? ['youtube', 'tiktok', 'instagram'] : [platformFilter];
    
    for (const content of generatedContent) {
      const brandedContent = content.branded_version || content;
      
      for (const platform of platforms) {
        try {
          const thumbnail = await viralAnalyzer.generateThumbnail(brandedContent, platform, style);
          
          if (thumbnail) {
            // Save to database
            const [savedThumbnail] = await db.insert(thumbnails).values({
              viralContentId: content.id || null,
              platform: platform,
              title: thumbnail.title,
              description: thumbnail.description,
              style: style,
              dimensions: thumbnail.dimensions,
              imageUrl: thumbnail.image_url,
              prompt: thumbnail.prompt,
              generationData: thumbnail.generation_data
            }).returning();
            
            thumbnailResults.push({
              id: savedThumbnail.id,
              platform: platform,
              title: thumbnail.title,
              description: thumbnail.description,
              style: style,
              dimensions: thumbnail.dimensions,
              image_url: thumbnail.image_url,
              prompt: thumbnail.prompt,
              created_at: savedThumbnail.createdAt
            });
          }
        } catch (thumbnailError) {
          console.error(`❌ Error generating ${platform} thumbnail:`, thumbnailError);
        }
      }
    }
    
    res.json({
      success: true,
      thumbnails: thumbnailResults,
      total: thumbnailResults.length
    });
    
  } catch (error) {
    console.error('❌ Error generating thumbnails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get saved thumbnails
app.get('/api/thumbnails', async (req, res) => {
  try {
    console.log('🎨 API: Fetching saved thumbnails...');
    
    // Add pagination to handle large number of thumbnails
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const savedThumbnails = await db.select().from(thumbnails)
      .orderBy(desc(thumbnails.createdAt))
      .limit(limit)
      .offset(offset);
    
    const formattedThumbnails = savedThumbnails.map(thumbnail => ({
      id: thumbnail.id,
      platform: thumbnail.platform,
      title: thumbnail.title,
      description: thumbnail.description,
      style: thumbnail.style,
      dimensions: thumbnail.dimensions,
      image_url: thumbnail.imageUrl,
      prompt: thumbnail.prompt,
      created_at: thumbnail.createdAt
    }));
    
    // Get total count for pagination info
    const totalCount = await db.select({ count: sql`count(*)` }).from(thumbnails);
    const total = parseInt(totalCount[0].count);
    
    res.json({
      success: true,
      thumbnails: formattedThumbnails,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching thumbnails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Regenerate a specific thumbnail
app.post('/api/regenerate-thumbnail/:id', async (req, res) => {
  try {
    console.log(`🎨 API: Regenerating thumbnail ${req.params.id}...`);
    
    const thumbnailId = parseInt(req.params.id);
    
    // Get the existing thumbnail
    const [existingThumbnail] = await db
      .select()
      .from(thumbnails)
      .where(eq(thumbnails.id, thumbnailId));
    
    if (!existingThumbnail) {
      return res.status(404).json({
        success: false,
        error: 'Thumbnail not found'
      });
    }
    
    // Generate new thumbnail with same parameters
    const newThumbnail = await viralAnalyzer.generateThumbnail(
      { title: existingThumbnail.title, description: existingThumbnail.description },
      existingThumbnail.platform,
      existingThumbnail.style
    );
    
    if (newThumbnail) {
      // Update the database
      const [updatedThumbnail] = await db
        .update(thumbnails)
        .set({
          imageUrl: newThumbnail.image_url,
          prompt: newThumbnail.prompt,
          generationData: newThumbnail.generation_data,
          updatedAt: new Date()
        })
        .where(eq(thumbnails.id, thumbnailId))
        .returning();
      
      res.json({
        success: true,
        thumbnail: {
          id: updatedThumbnail.id,
          platform: updatedThumbnail.platform,
          title: updatedThumbnail.title,
          description: updatedThumbnail.description,
          style: updatedThumbnail.style,
          dimensions: updatedThumbnail.dimensions,
          image_url: updatedThumbnail.imageUrl,
          prompt: updatedThumbnail.prompt,
          created_at: updatedThumbnail.createdAt
        }
      });
    } else {
      throw new Error('Failed to regenerate thumbnail');
    }
    
  } catch (error) {
    console.error('❌ Error regenerating thumbnail:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sample posts endpoint for viral content (legacy)
app.get('/api/posts', (req, res) => {
  const samplePosts = [
    {
      id: 1,
      title: "Medicine and Money: Why Most Doctors Stay Poor",
      content: "Learn the financial mistakes keeping medical professionals from building wealth...",
      likes: 3456,
      shares: 1234,
      timestamp: new Date().toISOString(),
      platform: "generated",
      brand_voice: "Medicine and Money Show"
    },
    {
      id: 2,
      title: "5-Minute Investment Strategy for Busy Physicians",
      content: "Transform your financial future with this simple approach that fits your schedule",
      likes: 5890,
      shares: 2456,
      timestamp: new Date().toISOString(),
      platform: "generated",
      brand_voice: "Medicine and Money Show"
    },
    {
      id: 3,
      title: "POV: You're a Doctor Who Finally Understands Money",
      content: "From consumer mindset to investor success - here's how to make the shift",
      likes: 8901,
      shares: 4321,
      timestamp: new Date().toISOString(),
      platform: "generated",
      brand_voice: "Medicine and Money Show"
    }
  ];
  
  res.json(samplePosts);
});

// Generate thumbnail with specific aspect ratio for platform export
app.post('/api/generate-thumbnail-with-ratio', async (req, res) => {
  try {
    const { postId, platform, dimensions, title, description } = req.body;
    
    if (!title || !dimensions) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and dimensions are required' 
      });
    }

    console.log(`🎨 Generating ${dimensions} thumbnail for ${platform}...`);
    
    const contentData = {
      title: title,
      description: description || '',
      platform: platform
    };
    
    // Parse dimensions to get width and height
    const [width, height] = dimensions.split('x').map(n => parseInt(n));
    
    if (!generateAIThumbnail) {
      return res.status(503).json({ 
        success: false, 
        error: 'AI thumbnail generation not available' 
      });
    }

    // Generate thumbnail with specific dimensions
    const thumbnailUrl = await generateAIThumbnail(contentData, 'professional', dimensions);
    
    // Save to database
    const [savedThumbnail] = await db.insert(thumbnails).values({
      socialPostId: postId || null,
      platform: platform,
      title: title,
      description: description || '',
      style: 'professional',
      dimensions: dimensions,
      imageUrl: thumbnailUrl,
      createdAt: new Date()
    }).returning();
    
    console.log(`✅ Custom ratio thumbnail generated: ${dimensions}`);
    
    res.json({
      success: true,
      thumbnail: {
        id: savedThumbnail.id,
        platform: platform,
        title: savedThumbnail.title,
        dimensions: dimensions,
        image_url: thumbnailUrl
      }
    });

  } catch (error) {
    console.error('❌ Error generating custom ratio thumbnail:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Enhanced Thumbnail Generation APIs

// Generate AI-powered thumbnail using Gemini
app.post('/api/thumbnails/ai-generate', async (req, res) => {
  try {
    const { contentData, style = 'professional' } = req.body;
    
    if (!contentData?.title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content data with title is required' 
      });
    }

    if (!generateAIThumbnail) {
      return res.status(503).json({ 
        success: false, 
        error: 'AI thumbnail generation not available. Please check Gemini API configuration.' 
      });
    }

    console.log(`🤖 Generating AI thumbnail for: ${contentData.title}`);
    
    // Generate thumbnail using Gemini AI
    const thumbnailUrl = await generateAIThumbnail(contentData, style);
    
    // Save to database
    const result = await db.insert(thumbnails).values({
      title: contentData.title,
      image_url: thumbnailUrl,
      platform: contentData.platform || 'youtube',
      dimensions: '1200x630',
      style: style,
      type: 'ai-generated',
      content_id: contentData.id || null,
      created_at: new Date()
    }).returning();

    console.log(`✅ AI thumbnail created and saved: ${thumbnailUrl}`);
    
    res.json({
      success: true,
      thumbnail: result[0],
      message: 'AI thumbnail generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating AI thumbnail:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate AI thumbnail' 
    });
  }
});

// Generate VIRAL AI-powered thumbnail using DALL-E 3
app.post('/api/thumbnails/viral-generate', async (req, res) => {
  try {
    const { contentData, style = 'professional', size = '1792x1024' } = req.body;
    
    if (!contentData?.title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content data with title is required' 
      });
    }

    if (!generateViralAIThumbnail) {
      return res.status(503).json({ 
        success: false, 
        error: 'DALL-E 3 thumbnail generation not available. Please check OpenAI API configuration.' 
      });
    }

    console.log(`🚀 Generating VIRAL AI thumbnail with DALL-E 3 for: ${contentData.title}`);
    
    // Generate viral thumbnail using DALL-E 3
    const thumbnailUrl = await generateViralAIThumbnail(contentData, style, size);
    
    // Save to database
    const result = await db.insert(thumbnails).values({
      title: contentData.title,
      image_url: thumbnailUrl,
      platform: contentData.platform || 'youtube',
      dimensions: size.replace('x', '×'),
      style: style,
      type: 'viral-ai-generated',
      content_id: contentData.id || null,
      created_at: new Date()
    }).returning();

    console.log(`✅ VIRAL AI thumbnail created and saved: ${thumbnailUrl}`);
    
    res.json({
      success: true,
      thumbnail: result[0],
      message: 'Viral AI thumbnail generated successfully with DALL-E 3'
    });

  } catch (error) {
    console.error('❌ Error generating viral AI thumbnail:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate viral AI thumbnail' 
    });
  }
});

// Generate multiple viral thumbnail variations
app.post('/api/thumbnails/viral-variations', async (req, res) => {
  try {
    const { contentData, styles = ['professional', 'bold'] } = req.body;
    
    if (!contentData?.title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content data with title is required' 
      });
    }

    if (!generateViralThumbnailVariations) {
      return res.status(503).json({ 
        success: false, 
        error: 'DALL-E 3 thumbnail generation not available.' 
      });
    }

    console.log(`🎨 Generating ${styles.length} viral thumbnail variations...`);
    
    const variations = await generateViralThumbnailVariations(contentData, styles);
    
    // Save all variations to database
    const savedThumbnails = [];
    for (const variation of variations) {
      const result = await db.insert(thumbnails).values({
        title: contentData.title,
        image_url: variation.path,
        platform: contentData.platform || 'youtube',
        dimensions: '1792×1024',
        style: variation.style,
        type: 'viral-variation',
        content_id: contentData.id || null,
        created_at: new Date()
      }).returning();
      
      savedThumbnails.push(result[0]);
    }

    console.log(`✅ Generated ${savedThumbnails.length} viral thumbnail variations`);
    
    res.json({
      success: true,
      thumbnails: savedThumbnails,
      message: `Generated ${savedThumbnails.length} viral thumbnail variations`
    });

  } catch (error) {
    console.error('❌ Error generating viral thumbnail variations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate viral thumbnail variations' 
    });
  }
});

// Generate template-based thumbnail using Remotion
app.post('/api/thumbnails/template-generate', async (req, res) => {
  try {
    const { contentData, style = 'professional', platform = 'youtube' } = req.body;
    
    if (!contentData?.title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content data with title is required' 
      });
    }

    if (!generateTemplateThumbnail) {
      return res.status(503).json({ 
        success: false, 
        error: 'Template thumbnail generation not available.' 
      });
    }

    console.log(`🎬 Generating template thumbnail for: ${contentData.title}`);
    
    // Generate thumbnail using Remotion templates
    const thumbnailUrl = await generateTemplateThumbnail(contentData, { 
      style, 
      platform 
    });
    
    // Save to database
    const result = await db.insert(thumbnails).values({
      title: contentData.title,
      image_url: thumbnailUrl,
      platform: platform,
      dimensions: platform === 'instagram' ? '1080x1080' : '1200x630',
      style: style,
      type: 'template-based',
      content_id: contentData.id || null,
      created_at: new Date()
    }).returning();

    console.log(`✅ Template thumbnail created and saved: ${thumbnailUrl}`);
    
    res.json({
      success: true,
      thumbnail: result[0],
      message: 'Template thumbnail generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating template thumbnail:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate template thumbnail' 
    });
  }
});

// Generate Veo 3 video-based thumbnail
app.post('/api/thumbnails/veo3-generate', async (req, res) => {
  try {
    const { contentData, style = 'professional' } = req.body;
    
    if (!contentData?.title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content data with title is required' 
      });
    }

    if (!generateVeo3Thumbnail) {
      return res.status(503).json({ 
        success: false, 
        error: 'Veo 3 thumbnail generation not available. Please check Gemini API configuration.' 
      });
    }

    console.log(`🎬 Generating Veo 3 thumbnail for: ${contentData.title}`);
    
    // Check FFmpeg availability first
    const ffmpegAvailable = await checkFFmpegAvailability();
    if (!ffmpegAvailable) {
      console.log('⚠️ FFmpeg not available, falling back to static generation');
      const fallbackUrl = await generateStaticFallback(contentData, style);
      
      // Save to database
      const result = await db.insert(thumbnails).values({
        title: contentData.title,
        image_url: fallbackUrl,
        platform: contentData.platform || 'youtube',
        dimensions: '1200x630',
        style: style,
        type: 'ai-generated-fallback',
        content_id: contentData.id || null,
        created_at: new Date()
      }).returning();

      return res.json({
        success: true,
        thumbnail: result[0],
        message: 'Thumbnail generated successfully (fallback method)',
        method: 'static-fallback'
      });
    }
    
    // Generate thumbnail using Veo 3
    const thumbnailUrl = await generateVeo3Thumbnail(contentData, style);
    
    // Save to database
    const result = await db.insert(thumbnails).values({
      title: contentData.title,
      image_url: thumbnailUrl,
      platform: contentData.platform || 'youtube',
      dimensions: '1200x630',
      style: style,
      type: 'veo3-generated',
      content_id: contentData.id || null,
      created_at: new Date()
    }).returning();

    console.log(`✅ Veo 3 thumbnail created and saved: ${thumbnailUrl}`);
    
    res.json({
      success: true,
      thumbnail: result[0],
      message: 'Veo 3 thumbnail generated successfully',
      method: 'veo3-video'
    });

  } catch (error) {
    console.error('❌ Error generating Veo 3 thumbnail:', error);
    
    // Try fallback on error
    try {
      console.log('🔄 Attempting fallback generation...');
      const fallbackUrl = await generateStaticFallback(req.body.contentData, req.body.style || 'professional');
      
      const result = await db.insert(thumbnails).values({
        title: req.body.contentData.title,
        image_url: fallbackUrl,
        platform: req.body.contentData.platform || 'youtube',
        dimensions: '1200x630',
        style: req.body.style || 'professional',
        type: 'ai-generated-fallback',
        content_id: req.body.contentData.id || null,
        created_at: new Date()
      }).returning();

      res.json({
        success: true,
        thumbnail: result[0],
        message: 'Thumbnail generated with fallback method',
        method: 'fallback',
        originalError: error.message
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to generate Veo 3 thumbnail',
        fallbackError: fallbackError.message
      });
    }
  }
});

// Get content for thumbnail generation
app.get('/api/content', async (req, res) => {
  try {
    console.log('📚 API: Fetching content for thumbnail generation...');
    
    const content = await db.select().from(viralContent).limit(20);
    
    const formattedContent = content.map(item => ({
      id: item.id,
      title: item.title,
      description: item.generated_content || item.description,
      platform: item.platform || 'viral',
      created_at: item.created_at
    }));
    
    res.json({
      success: true,
      content: formattedContent
    });

  } catch (error) {
    console.error('❌ Error fetching content:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch content' 
    });
  }
});

// Get available thumbnail templates
app.get('/api/thumbnails/templates', (req, res) => {
  try {
    const templates = getAvailableTemplates ? getAvailableTemplates() : [
      {
        id: 'professional',
        name: 'Professional Medical',
        description: 'Clean, trustworthy design for medical professionals'
      },
      {
        id: 'bold', 
        name: 'Bold & Dynamic',
        description: 'Eye-catching design for viral content'
      },
      {
        id: 'medical',
        name: 'Medical Authority', 
        description: 'Strong medical theme with healthcare focus'
      },
      {
        id: 'wealth',
        name: 'Wealth & Success',
        description: 'Financial success theme with gold accents'
      }
    ];

    res.json({
      success: true,
      templates: templates
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch templates' 
    });
  }
});

// Analyze content for optimal thumbnail strategy
app.post('/api/thumbnails/analyze', async (req, res) => {
  try {
    const { contentData } = req.body;
    
    if (!contentData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content data is required' 
      });
    }

    let analysis = {
      recommendedStyle: 'professional',
      reasoning: 'Default professional style',
      keyElements: ['medical symbols', 'clean typography'],
      textStrategy: 'Clear, readable title',
      colorFocus: 'Professional blue palette'
    };

    // Use AI analysis if available
    if (analyzeContentForThumbnail) {
      try {
        analysis = await analyzeContentForThumbnail(contentData);
      } catch (error) {
        console.log('⚠️ AI analysis failed, using defaults:', error.message);
      }
    }

    res.json({
      success: true,
      analysis: analysis,
      recommendations: {
        ai: analysis.recommendedStyle === 'bold' || analysis.recommendedStyle === 'medical',
        template: analysis.recommendedStyle === 'professional' || analysis.recommendedStyle === 'wealth'
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing content:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze content' 
    });
  }
});

/* 
 * PLATFORM DIRECT POSTING IMPLEMENTATION NOTES
 * ============================================
 * 
 * For future OAuth-based direct posting to social media platforms:
 * 
 * YOUTUBE DATA API v3:
 * - Requires OAuth 2.0 (no service accounts supported)
 * - Scope: https://www.googleapis.com/auth/youtube.upload
 * - 2025 Restriction: Unverified apps post videos as PRIVATE only
 * - Need Google Cloud Console project + app verification for public posts
 * - Rate: 1,600 quota units per video (10,000 units/day default)
 * 
 * TIKTOK CONTENT POSTING API:
 * - OAuth 2.0 flow with 24-hour token expiry
 * - Scopes: user.info.basic, video.publish, video.upload
 * - Business Account Required for auto-publishing (regular = drafts only)
 * - Multi-step: Initialize → Upload chunks → Publish
 * - App approval required for production
 * 
 * INSTAGRAM GRAPH API:
 * - Requires Business/Creator Account + Facebook Page connection
 * - Permissions: instagram_basic, instagram_content_publish
 * - Rate limits: 200 calls/hour, 25 posts/24 hours
 * - Long-lived tokens (60 days), refreshable
 * - Two-step: Create media container → Publish
 * 
 * Implementation would require:
 * 1. OAuth consent screens for each platform
 * 2. Secure token storage and refresh logic
 * 3. Platform-specific upload workflows
 * 4. Error handling and rate limit management
 * 5. App verification processes for production use
 * 
 * Current solution: Export package system with download + copy functionality
 */

// Serve the main app (MUST be last - after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server with proper host binding for Replit
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Viral app is running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});