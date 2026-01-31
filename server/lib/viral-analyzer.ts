import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY 
});

interface ViralTopic {
  keyword: string;
  averageInterest: number;
  trendDirection: "up" | "down" | "stable";
  popularity: "high" | "medium" | "low";
  contentSuggestion: {
    title: string;
    urgency: string;
    reason: string;
  };
}

interface GeneratedContent {
  platform: string;
  title: string;
  description: string;
  script?: string;
  hashtags: string[];
  hooks: string[];
  viralityScore: number;
  thumbnailPrompt: string;
}

interface SocialPost {
  platform: string;
  title: string;
  description: string;
  script?: string;
  hashtags: string[];
  hooks: string[];
  targetLength: string;
  viralityScore: number;
}

const MEDICINE_MONEY_KEYWORDS = [
  "doctor money",
  "physician investment",
  "medical student debt",
  "doctor salary",
  "physician real estate",
  "medical practice finance",
  "doctor retirement",
  "physician wealth building",
];

const CONTENT_SUGGESTIONS: Record<string, string[]> = {
  "doctor money": [
    "Why Most Doctors Stay Poor (And How to Fix It)",
    "Doctor Money Mistakes That Cost Millions",
    "Physician Wealth Building Secrets",
  ],
  "physician investment": [
    "Best Investments for Busy Doctors",
    "Physician Real Estate Investment Guide",
    "Doctor Portfolio Strategies That Work",
  ],
  "medical student debt": [
    "How to Pay Off Medical School Debt Fast",
    "Medical Student Money Management Tips",
    "From Debt to Wealth: Doctor Success Stories",
  ],
  "doctor salary": [
    "Physician Salary Negotiation Secrets",
    "Doctor Income Optimization Strategies",
    "Maximizing Your Medical Practice Income",
  ],
  "physician real estate": [
    "Real Estate Investing for Doctors",
    "Physician Property Investment Guide",
    "How Doctors Build Wealth Through Real Estate",
  ],
  "medical practice finance": [
    "Medical Practice Financial Management",
    "Optimizing Practice Revenue Streams",
    "Financial Planning for Medical Practices",
  ],
  "doctor retirement": [
    "Physician Retirement Planning Guide",
    "Doctor Retirement Mistakes to Avoid",
    "Early Retirement Strategies for Physicians",
  ],
  "physician wealth building": [
    "Wealth Building Strategies for Doctors",
    "How Physicians Create Generational Wealth",
    "Financial Independence for Medical Professionals",
  ],
};

export class ViralContentAnalyzer {
  async discoverViralTopics(): Promise<ViralTopic[]> {
    const topics: ViralTopic[] = [];

    for (const keyword of MEDICINE_MONEY_KEYWORDS) {
      const suggestions = CONTENT_SUGGESTIONS[keyword] || [
        `Create engaging content about ${keyword}`,
      ];
      const randomSuggestion =
        suggestions[Math.floor(Math.random() * suggestions.length)];

      const interest = Math.floor(Math.random() * 60) + 40;
      const directions: Array<"up" | "down" | "stable"> = ["up", "down", "stable"];
      const direction = directions[Math.floor(Math.random() * 3)];

      topics.push({
        keyword,
        averageInterest: interest,
        trendDirection: direction,
        popularity: interest > 70 ? "high" : interest > 50 ? "medium" : "low",
        contentSuggestion: {
          title: randomSuggestion,
          urgency:
            direction === "up" ? "high" : interest > 50 ? "medium" : "low",
          reason:
            direction === "up"
              ? "Trending upward - act fast!"
              : interest > 50
              ? "High interest topic"
              : "Steady interest - good evergreen content",
        },
      });
    }

    return topics.sort((a, b) => b.averageInterest - a.averageInterest);
  }

  async generateViralContent(
    topic: string,
    platforms: string[] = ["youtube", "tiktok", "instagram"]
  ): Promise<GeneratedContent[]> {
    const results: GeneratedContent[] = [];

    for (const platform of platforms) {
      try {
        const prompt = this.buildContentPrompt(topic, platform);
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a viral content strategist for "The Medicine & Money Show" - a podcast about physician finance, investing, and entrepreneurship. Generate engaging, viral content optimized for ${platform}. Always respond in valid JSON format.`,
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1500,
          temperature: 0.8,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(
              content.replace(/```json\n?|\n?```/g, "").trim()
            );
            results.push({
              platform,
              title: parsed.title || topic,
              description: parsed.description || "",
              script: parsed.script,
              hashtags: parsed.hashtags || [],
              hooks: parsed.hooks || [],
              viralityScore: parsed.viralityScore || 75,
              thumbnailPrompt: parsed.thumbnailPrompt || "",
            });
          } catch {
            results.push(this.createFallbackContent(topic, platform));
          }
        }
      } catch (error) {
        console.error(`Error generating ${platform} content:`, error);
        results.push(this.createFallbackContent(topic, platform));
      }
    }

    return results;
  }

  private buildContentPrompt(topic: string, platform: string): string {
    const platformSpecs: Record<string, string> = {
      youtube: "60-second to 15-minute video with strong hook in first 5 seconds",
      tiktok: "15-60 second vertical video with trending audio potential",
      instagram: "Carousel post or 30-60 second Reel with shareable insights",
    };

    return `Create viral ${platform} content about "${topic}" for The Medicine & Money Show.

Platform specs: ${platformSpecs[platform] || "engaging social content"}

Return JSON with:
{
  "title": "Catchy title (max 60 chars)",
  "description": "Compelling description with CTA",
  "script": "Full script with hook, body, CTA",
  "hashtags": ["relevant", "trending", "hashtags"],
  "hooks": ["3 alternative opening hooks"],
  "viralityScore": 85,
  "thumbnailPrompt": "Description for AI thumbnail with REAL OBJECTS (e.g., stethoscope, gold bars, medical equipment)"
}`;
  }

  private createFallbackContent(topic: string, platform: string): GeneratedContent {
    return {
      platform,
      title: `${topic} - Medicine & Money Insights`,
      description: `Learn the secrets that successful physicians use to build wealth while practicing medicine.`,
      hashtags: ["#MedicineAndMoney", "#PhysicianFinance", "#DoctorWealth"],
      hooks: [
        "Most doctors make this money mistake...",
        "What they don't teach in medical school about wealth...",
        "The #1 investment strategy for busy physicians...",
      ],
      viralityScore: 70,
      thumbnailPrompt: `Professional physician with stethoscope next to gold coins and financial charts, photorealistic`,
    };
  }

  async generateSocialPost(
    content: GeneratedContent | { title: string; description?: string },
    platform: string
  ): Promise<SocialPost> {
    const targetLengths: Record<string, string> = {
      youtube: "8-15 minutes",
      tiktok: "30-60 seconds",
      instagram: "60-90 seconds",
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a social media expert for The Medicine & Money Show. Create platform-optimized posts. Respond in valid JSON.`,
          },
          {
            role: "user",
            content: `Create a ${platform} post based on: "${content.title}"

Return JSON:
{
  "title": "Platform-optimized title",
  "description": "Engaging caption with emojis",
  "script": "Full content script",
  "hashtags": ["trending", "relevant", "hashtags"],
  "hooks": ["attention-grabbing", "opening", "lines"],
  "targetLength": "${targetLengths[platform] || "60 seconds"}",
  "viralityScore": 85
}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const responseContent = response.choices[0]?.message?.content;
      if (responseContent) {
        const parsed = JSON.parse(
          responseContent.replace(/```json\n?|\n?```/g, "").trim()
        );
        return {
          platform,
          title: parsed.title,
          description: parsed.description,
          script: parsed.script,
          hashtags: parsed.hashtags || [],
          hooks: parsed.hooks || [],
          targetLength: parsed.targetLength || targetLengths[platform],
          viralityScore: parsed.viralityScore || 75,
        };
      }
    } catch (error) {
      console.error("Error generating social post:", error);
    }

    return {
      platform,
      title: content.title,
      description: content.description || "Medicine & Money insights",
      hashtags: ["#MedicineAndMoney", "#PhysicianFinance"],
      hooks: ["Most doctors don't know this..."],
      targetLength: targetLengths[platform] || "60 seconds",
      viralityScore: 70,
    };
  }

  async analyzeViralPotential(content: string): Promise<{
    score: number;
    factors: string[];
    improvements: string[];
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a viral content analyst. Analyze content for viral potential on social media. Respond in valid JSON.`,
          },
          {
            role: "user",
            content: `Analyze this content for viral potential:
"${content}"

Return JSON:
{
  "score": 85,
  "factors": ["Strong hook", "Emotional appeal", "Clear value"],
  "improvements": ["Add urgency", "Include call-to-action", "Use power words"]
}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.6,
      });

      const responseContent = response.choices[0]?.message?.content;
      if (responseContent) {
        return JSON.parse(
          responseContent.replace(/```json\n?|\n?```/g, "").trim()
        );
      }
    } catch (error) {
      console.error("Error analyzing viral potential:", error);
    }

    return {
      score: 70,
      factors: ["Topic relevance", "Niche appeal"],
      improvements: ["Add emotional hook", "Include statistics"],
    };
  }
}

export const viralAnalyzer = new ViralContentAnalyzer();
