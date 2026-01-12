import { useState } from 'react';

interface Resource {
  title: string;
  description: string;
  type: 'article' | 'video' | 'exercise' | 'book';
  duration: string;
  url: string;
  featured?: boolean;
}

// Easy to update - just edit this array
const resources: Resource[] = [
  // Featured
  {
    title: 'How to Deal with Difficult People',
    description: 'Harvard-backed strategies for navigating challenging workplace relationships with empathy and boundaries.',
    type: 'article',
    duration: '7 min read',
    url: 'https://hbr.org/2022/09/how-to-deal-with-a-mean-colleague',
    featured: true,
  },
  {
    title: 'The Secret to Giving Great Feedback',
    description: 'LeeAnn Renninger shares a science-based method for delivering feedback that actually lands.',
    type: 'video',
    duration: '8 min watch',
    url: 'https://www.ted.com/talks/leeann_renninger_the_secret_to_giving_great_feedback',
    featured: true,
  },
  // Articles
  {
    title: 'What Great Listeners Actually Do',
    description: 'Research reveals that great listening goes beyond staying quiet—it\'s about making people feel heard.',
    type: 'article',
    duration: '6 min read',
    url: 'https://hbr.org/2016/07/what-great-listeners-actually-do',
  },
  {
    title: 'Manage Your Energy, Not Your Time',
    description: 'Tony Schwartz on why sustainable high performance requires managing your energy, not just your calendar.',
    type: 'article',
    duration: '10 min read',
    url: 'https://hbr.org/2007/10/manage-your-energy-not-your-time',
  },
  {
    title: 'How to Say No to Taking on More Work',
    description: 'Practical scripts and strategies for setting boundaries without damaging relationships.',
    type: 'article',
    duration: '5 min read',
    url: 'https://hbr.org/2022/12/how-to-say-no-to-taking-on-more-work',
  },
  // Videos
  {
    title: 'How to Lead in a Crisis',
    description: 'Amy Edmondson on the leadership behaviors that help teams navigate uncertainty and change.',
    type: 'video',
    duration: '12 min watch',
    url: 'https://www.ted.com/talks/amy_c_edmondson_how_to_lead_in_a_crisis',
  },
  {
    title: 'Building a Psychologically Safe Workplace',
    description: 'Amy Edmondson explains why psychological safety is the foundation of high-performing teams.',
    type: 'video',
    duration: '14 min watch',
    url: 'https://www.youtube.com/watch?v=LhoLuui9gX8',
  },
  {
    title: 'How to Have Better Conversations',
    description: 'Celeste Headlee shares 10 rules for having more meaningful, connected conversations.',
    type: 'video',
    duration: '12 min watch',
    url: 'https://www.ted.com/talks/celeste_headlee_10_ways_to_have_a_better_conversation',
  },
  // Exercises
  {
    title: '5-Minute Journal Template',
    description: 'A simple morning and evening reflection practice to build gratitude and intention.',
    type: 'exercise',
    duration: '5 min daily',
    url: 'https://www.intelligentchange.com/pages/five-minute-journal-app',
  },
  {
    title: 'Difficult Conversation Planner',
    description: 'A structured worksheet from Crucial Conversations to prepare for high-stakes discussions.',
    type: 'exercise',
    duration: '15 min prep',
    url: 'https://cruciallearning.com/blog/how-to-prepare-for-a-crucial-conversation/',
  },
  {
    title: 'Energy Audit Worksheet',
    description: 'Identify what energizes vs. drains you to make better decisions about where to focus.',
    type: 'exercise',
    duration: '20 min exercise',
    url: 'https://www.mindtools.com/aycnkop/managing-your-energy',
  },
  // Books
  {
    title: 'Radical Candor',
    description: 'Kim Scott\'s framework for caring personally while challenging directly—the key to being a great boss.',
    type: 'book',
    duration: 'Book',
    url: 'https://www.radicalcandor.com/the-book/',
  },
  {
    title: 'Essentialism',
    description: 'Greg McKeown\'s disciplined pursuit of less—a guide to doing what matters most.',
    type: 'book',
    duration: 'Book',
    url: 'https://gregmckeown.com/books/essentialism/',
  },
  {
    title: 'Crucial Conversations',
    description: 'Tools for talking when stakes are high, opinions vary, and emotions run strong.',
    type: 'book',
    duration: 'Book',
    url: 'https://cruciallearning.com/crucial-conversations-book/',
  },
];

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  article: { icon: '📄', label: 'Articles', color: 'blue' },
  video: { icon: '▶️', label: 'Videos', color: 'purple' },
  exercise: { icon: '✏️', label: 'Exercises', color: 'green' },
  book: { icon: '📚', label: 'Books', color: 'orange' },
};

export default function Resources() {
  const [activeType, setActiveType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredResources = resources.filter(r => r.featured);

  const filteredResources = resources.filter(r => {
    const matchesType = activeType === 'all' || r.type === activeType;
    const matchesSearch = !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch && !r.featured;
  });

  const types = ['all', 'article', 'video', 'exercise', 'book'];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">Resources</h1>
        <p className="text-gray-500 mt-2 font-medium">Curated content to support your growth journey.</p>
      </header>

      {/* Featured Section */}
      {activeType === 'all' && !searchQuery && featuredResources.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Featured</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {featuredResources.map((resource, idx) => (
              <a
                key={idx}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-boon-blue/5 to-boon-lightBlue/20 p-6 rounded-2xl border border-boon-blue/10 hover:border-boon-blue/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{typeConfig[resource.type].icon}</span>
                  <span className="text-[10px] font-bold text-boon-blue uppercase tracking-widest">
                    {resource.type}
                  </span>
                </div>
                <h3 className="font-bold text-boon-text group-hover:text-boon-blue transition-colors text-lg">
                  {resource.title}
                </h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {resource.description}
                </p>
                <p className="text-xs text-gray-400 mt-3 font-medium">
                  {resource.duration}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-boon-blue focus:ring-2 focus:ring-boon-blue/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeType === type
                  ? 'bg-boon-blue text-white shadow-lg shadow-boon-blue/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {type !== 'all' && <span>{typeConfig[type].icon}</span>}
              <span>{type === 'all' ? 'All' : typeConfig[type].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource, idx) => (
          <a
            key={idx}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-boon-blue/30 transition-all flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <span>{typeConfig[resource.type].icon}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {resource.type}
              </span>
            </div>
            <h3 className="font-bold text-boon-text group-hover:text-boon-blue transition-colors leading-snug">
              {resource.title}
            </h3>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">
              {resource.description}
            </p>
            <p className="text-xs text-gray-400 mt-3 font-medium">
              {resource.duration}
            </p>
          </a>
        ))}
      </div>

      {/* Empty State */}
      {filteredResources.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400">No resources found{searchQuery && ` matching "${searchQuery}"`}</p>
        </div>
      )}

      {/* Tip Card */}
      <section className="bg-gradient-to-br from-boon-lightBlue/30 to-boon-bg p-8 rounded-[2rem] border border-boon-lightBlue/30">
        <div className="flex items-start gap-4">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="font-bold text-boon-text mb-2">Getting the most from resources</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Pick one resource that resonates with where you are right now. Before your next session,
              try applying one concept and share your experience with your coach.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
