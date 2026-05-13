window.PianoApp = window.PianoApp || {};

window.PianoApp.data = {
  projects: [
    {
      id: "3",
      name: "抽丝剥茧",
      nameEn: "Unveiling",
      description: "类比分析 Agentic Workflow 搭建 — 自己的方法论沉淀。将个人思维习惯产品化，通过结构化类比（剥离表面噪音，提取底层机制，在时空不同角落寻找同构案例）来分析问题。<br>拆解为五步工作流（结构抽象→搜索生成→查询验证→案例提取→洞察回映），设计多智能体工作流，实现从问题抽象、跨域/跨时代案例搜索到洞察回映的全链路自动化。",
      descriptionEn: "Analogical-Analysis Agentic Workflow — crystallizing a personal methodology into a product. Turns structured analogical reasoning into a tool: strip surface noise, extract underlying mechanisms, and hunt for isomorphic cases across time and space.<br>Decomposed into a five-step workflow with five specialized agents. Built a multi-agent workflow with LangGraph that automates the full pipeline — problem abstraction → cross-domain/cross-era case search → insight reflection.",
      year: "2026",
      category: "AI 产品",
      categoryEn: "AI Product",
      image: "assets/images/unveiling.jpg",
      tech: ["LangGraph", "多智能体", "Prompt 工程"],
      techEn: ["LangGraph", "Multi-Agent", "Prompt Engineering"],
      link: "https://unveiling.onrender.com/",
    },
    {
      id: "1",
      name: "一个能弹琴的个人主页",
      nameEn: "Play Piano Online",
      description: "灵感源自 Pinterest 上看到的<a href='https://pin.it/FAAK2mtJ5' target='_blank'>钢琴</a>和<a href='https://pin.it/5Ww8Bq78A' target='_blank'>曲谱小猫</a>，以及 Kimi <a href='https://www.kimi.com/membership/pricing' target='_blank'>会员订阅页</a>底部的曲谱。设计真实钢琴演奏交互；通过长按琴键触发子页面跳转；还有致敬 Beatles 的动画和乐谱上会弹钢琴的小猫，快点击试试吧。",
      descriptionEn: "Inspired by a <a href='https://pin.it/FAAK2mtJ5' target='_blank'>piano</a> and a <a href='https://pin.it/5Ww8Bq78A' target='_blank'>kitten on a music score</a> spotted on Pinterest, plus the score at the bottom of Kimi's <a href='https://www.kimi.com/membership/pricing' target='_blank'>pricing page</a>. Real piano-playing interactions, long-press a labeled key to jump to a sub-page, a Beatles-tribute animation, and a piano-playing kitten on the score — go ahead, click around.",
      year: "2026",
      category: "自娱自乐",
      categoryEn: "Creative",
      image: "assets/images/piano.png",
      tech: ["Vibe Coding", "音乐", "乐队"],
      techEn: ["Vibe Coding", "Music", "Band"],
      link: "https://www.lovegood.cool",
    },
    {
      id: "2",
      name: " 蓝天白云",
      nameEn: "Blue Sky & White Cloud",
      description: "灵感源于 @baothiento 的<a href='https://x.com/baothiento/status/2033203600298488136?s=20' target='_blank'>池塘</a>和张悬的<a href='https://music.163.com/#/song?id=326697' target='_blank'>《蓝天白云》</a><br>向下滚动由白天滑入星空——白天点击放飞飞鸟、微风落叶；夜晚点击流星触发漫天星雨，探索星座连线，还有机会看见稀有的彗星！",
      descriptionEn: "Inspired by @baothiento's <a href='https://x.com/baothiento/status/2033203600298488136?s=20' target='_blank'>pond</a> and Deserts Chang's <a href='https://music.163.com/#/song?id=326697' target='_blank'>&ldquo;Blue Sky &amp; White Cloud&rdquo;</a>.<br>Scroll down to glide from daylight into a starry night — by day, click to release birds and let leaves drift in the breeze; by night, click a meteor to summon a falling-star storm, trace constellations, and maybe spot a rare comet.",
      year: "2026",
      category: "自娱自乐",
      categoryEn: "Creative",
      image: "assets/images/BlueSkyWhiteCloud.jpg",
      tech: ["Vibe Coding", "星空", "自然"],
      techEn: ["Vibe Coding", "Starry Sky", "Nature"],
      link: "BlueSkyWhiteCloud.html",
    }
  ],

  experiences: [
    {
      id: "1",
      orgName: "北京师范大学",
      orgNameEn: "Beijing Normal University",
      orgLocation: "珠海",
      orgLocationEn: "Zhuhai",
      tags: ["985", "双一流"],
      tagsEn: ["985", "Double First-Class"],
      position: "应用统计 · 硕士",
      positionEn: "Applied Statistics · M.S.",
      startDate: "2025-09",
      endDate: null,
      roles: [
        {
          titleZh: "学业表现",
          titleEn: "Academic Performance",
          description: "GPA 3.6/4.0，主要课程：深度学习、回归分析、多元统计分析、广义线性模型、教育测量、心理发展与教育、课程与教学。",
          descriptionEn: "GPA 3.6/4.0. Core courses: Deep Learning, Regression Analysis, Multivariate Statistics, Generalized Linear Models, Educational Measurement, Psychological Development &amp; Education, and Curriculum &amp; Instruction."
        },
        {
          titleZh: "校园经历",
          titleEn: "Campus Involvement",
          description: "策划组织 2 场班级文艺晚会、世界阅读日读书分享等活动，提升班级凝聚力，有效带动校运会报名，参与人数达全班1/5",
          descriptionEn: "Planned and ran 2 class talent shows and a World Book Day reading session, strengthening class cohesion — and drove sports-meet participation to roughly 1 in 5 classmates."
        }
      ]
    },
    {
      id: "2",
      orgName: "北京与爱为舞科技有限公司",
      orgNameEn: "Yu'ai Weiwu Technology Co., Ltd.",
      orgLocation: "北京",
      orgLocationEn: "Beijing",
      tags: ["K12 AI 教育", "独角兽"],
      tagsEn: ["K12 AI Education", "Unicorn"],
      position: "产品经理 · 实习",
      positionEn: "Product Manager · Intern",
      startDate: "2025-06",
      endDate: "2025-09",
      roles: [
        {
          titleZh: "C 端核心体验优化",
          titleEn: "Consumer Experience",
          description: "产品上线初期，因交互认知偏差和音视频体验问题产生大量负面反馈。针对高频问题（如麦克风图标误触、数字人-视频切换生硬、退出重进后重复上课、音画不同步等），设计并推动上线辅助文字提示、蒙版遮罩过渡、断点续学机制、数字人推流优化等方案，相关用户反馈频次降低 90%；初步设计数据埋点、分析方案，为产品决策提供数据支撑。",
          descriptionEn: "Just after launch, the product drew heavy negative feedback from interaction-cognition gaps and audio/video glitches. For the highest-frequency pain points (mic-icon mistaps, jarring digital-human↔video transitions, lessons replaying after re-entry, A/V desync, etc.) I designed and shipped contextual hint copy, masked transitions, lesson-resumption logic, and digital-human stream optimizations — cutting related complaints by ~90%. Also drafted the analytics event taxonomy and analysis framework to ground product decisions in data."
        },
        {
          titleZh: "B 端运营效率工具建设",
          titleEn: "Internal Tooling",
          description: "针对设计团队板书制作负担重问题，推动上线智能板书功能，提升设计团队生产效率；针对非技术背景销售排课系统学习成本高问题，对高频场景设计常用体验课排课模板，简化配课流程，提升销售工作效率。",
          descriptionEn: "To ease the design team's heavy lesson-board workload, drove the launch of an AI-assisted board feature, boosting design throughput. For non-technical sales staff facing a steep learning curve on the scheduling system, designed ready-made templates for high-frequency trial-class scenarios — streamlining scheduling and improving sales productivity."
        },
        {
          titleZh: "AI 技术选型与个性化策略",
          titleEn: "AI &amp; Personalization",
          description: "<ul><li><strong>AI 生成板书</strong>：在智能板书的基础上，更近一步地构想通过 AI 赋能板书生成过程。搭建评估调研框架，对 Midjourney、可灵、Gemini Storybook 等 AI 图片生成工具的结构化板书生成效果进行系统评测。</li><li><strong>ASR 语音识别</strong>：针对数字人在交互时“答非所问”的情况，建立评估体系，评估自研、火山、MiniMax 等平台的 ASR 效果。</li><li><strong>个性化学习</strong>：为赋予 AI 数字人更科学、更有效的“千人千面，因材施教”个性化施教能力，从「学生测度、题目测度、知识图谱和推荐算法」四个维度进行调研，协助制定产品长远期个性化学习实现策略。</li></ul>",
          descriptionEn: "<ul><li><strong>AI Board Generation</strong>: building on the assisted-board feature, scoped how AI could generate lesson boards end-to-end. Built an evaluation framework and benchmarked the structured-board output of Midjourney, Kling, Gemini Storybook, and others.</li><li><strong>ASR Evaluation</strong>: to address the digital human's off-topic replies during interaction, designed a comparative evaluation framework and benchmarked in-house, Volcano, and MiniMax ASR platforms.</li><li><strong>Personalized Learning</strong>: to give the AI digital human a more rigorous, effective &ldquo;teach to each student&rdquo; capability, researched four pillars — student modeling, item modeling, knowledge graphs, and recommendation algorithms — and helped shape the long-range personalization roadmap.</li></ul>"
        }
      ]
    },
    {
      id: "3",
      orgName: "高露洁棕榄(中国)有限公司",
      orgNameEn: "Colgate-Palmolive (China) Co., Ltd.",
      orgLocation: "广州",
      orgLocationEn: "Guangzhou",
      tags: ["世界 500 强", "快消"],
      tagsEn: ["Fortune 500", "FMCG"],
      position: "数字化专员 · 实习",
      positionEn: "Digital Specialist · Intern",
      startDate: "2024-03",
      endDate: "2024-09",
      roles: [
        {
          titleZh: "HR 流程自动化与效能提升",
          titleEn: "HR Automation",
          description: "针对 HR 部门在招聘、入离职、档案管理等场景的重复性的手动操作（如跨平台复制候选人信息、员工资料核对与移动归档、开具证明等）设计 RPA 自动化解决方案，并基于 ShadowBot、Apps Script、Python 进行开发落地。覆盖一键生成证明、招聘端自动回复、候选人信息抓取，为部门同事节省时间成本日均 30min+。",
          descriptionEn: "Designed RPA solutions for the HR team's repetitive manual work across recruiting, on/offboarding, and records management (cross-platform candidate copy-paste, employee record auditing and archival migration, certificate issuance, etc.), and shipped them using ShadowBot, Apps Script, and Python. Deliverables included one-click certificate generation, recruiting auto-replies, and candidate info scraping — saving teammates 30+ minutes per person per day on average."
        },
        {
          titleZh: "AI 赋能招聘流程",
          titleEn: "AI-Driven Recruiting",
          description: "针对招聘流程中简历初筛效率低的问题，设计基于 RAG 的 AI 候选人评估辅助系统，并基于 Python 与大模型 API 接口开发，对候选人简历进行语义解析与岗位匹配度评估，实现自动筛选和生成评估建议，提升简历初筛效率.",
          descriptionEn: "To speed up the slow first-pass resume screen, designed a RAG-based AI candidate-evaluation assistant and built it on Python and LLM APIs to perform semantic resume parsing, role-fit scoring, and auto-generated screening recommendations — significantly accelerating early-stage review."
        }
      ]
    },
    {
      id: "4",
      orgName: "广州大学",
      orgNameEn: "Guangzhou University",
      orgLocation: "广州",
      orgLocationEn: "Guangzhou",
      tags: ["111 计划"],
      tagsEn: ["111 Project"],
      position: "统计学 · 本科",
      positionEn: "Statistics · B.S.",
      startDate: "2021-09",
      endDate: "2025-06",
      roles: [
        {
          titleZh: "学业表现",
          titleEn: "Academic Performance",
          description: "GPA 3.5/4.0，专业课《统计学概论》成绩专业第一。曾获校级一等、三等奖学金，校优秀学生、校优秀毕业生。主要课程：概率论与数理统计、机器学习、数据挖掘、数据可视化 (Tableau)、Python 程序设计、统计软件-R。",
          descriptionEn: "GPA 3.5/4.0; top score in the major for Introduction to Statistics. Awarded First-Class and Third-Class scholarships, recognized as Outstanding Student and Outstanding Graduate. Core courses: Probability &amp; Mathematical Statistics, Machine Learning, Data Mining, Data Visualization (Tableau), Python Programming, and Statistical Software (R)."
        },
        {
          titleZh: "校园经历",
          titleEn: "Campus Involvement",
          description: "<ul><li>担任<strong>广州大学学生天文爱好者协会执行会长</strong>：对接、组织校内外天文科普活动; 担任并培养校天象馆四季星空讲解员; 组织特殊天象(如流星雨、日月食、超级月亮等)观测；</li><li>担任<strong>广州大学学生软件技术应用协会会长</strong>：定期开展协会成员技术交流与培训; 定期开展讲座(如Windows、Office使用技巧等); 每周值班或上门为师生解决软件问题。</li></ul>",
          descriptionEn: "<ul><li>Served as <strong>Executive President of the GZHU Astronomy Club</strong>: organized on- and off-campus astronomy outreach, recruited and trained the planetarium's four-season-sky docents, and ran observing nights for special events (meteor showers, eclipses, supermoons, etc.).</li><li>Served as <strong>President of the GZHU Software Tech Application Club</strong>: ran regular member meetups and trainings (Windows tips, Office tricks, etc.), and held weekly office hours plus on-site visits to help students and faculty with software issues.</li></ul>"
        },
        {
          titleZh: "竞赛与科研",
          titleEn: "Competitions",
          description: "挑战杯省赛二等奖 & 统计建模大赛省赛二等奖。使用 Python 爬虫抓取沪深上市公司 2010-2021 年报数据，构建企业数字化程度指标。成果转化为 ESCI 期刊 Green Finance (IF=5.5) 论文 <a href='https://www.aimspress.com/article/doi/10.3934/GF.2024019' target='_blank'>(Fu & Xu, 2024)</a>。",
          descriptionEn: "Provincial Second Prize at the Challenge Cup and the Statistical Modeling Competition. Used Python scrapers to collect 2010–2021 annual reports from Shanghai/Shenzhen-listed companies and built a corporate-digitalization index. The findings were published as <a href='https://www.aimspress.com/article/doi/10.3934/GF.2024019' target='_blank'>(Fu &amp; Xu, 2024)</a> in <em>Green Finance</em>, an ESCI journal (IF=5.5)."
        }
      ]
    },
  ],

  about: {
    name: "黄添成",
    nameEn: "Lovegood",
    typewriter: [
      "为什么想要成为一名产品经理？",
      "产品会影响人们的生活。而好的产品不是让人离不开它，而是帮人把时间和精力省出来，去享受更重要的事。",
      "我想做的就是设计这样的产品：它存在的意义，是让人们忘记它，把更多精力还给生活本身。",
      "这也是我想做产品经理的原因：在技术发展迅速的时代，希望自己做的东西，能帮人们给生活多留一些时间 ：）"
    ],
    typewriterEn: [
      "Why do I want to become a product manager?",
      "Products shape how people live. The best ones aren't the kind you can't put down — they're the kind that quietly hand your time and attention back to the things that actually matter.",
      "What I want to design are products like that: ones whose purpose is to be forgotten, leaving more of life intact.",
      "That's why I want to be a PM: in an era of rapid technological change, I'd like the things I build to help people keep a little more time for living. :)"
    ],
    avatar: "assets/images/avatar.png",
    avatarAlt: "大明星的个人头像",
    avatarAltEn: "Avatar of a budding star ;)",
    bio: [
      "目前正在北师大攻读应用统计硕士学位，同时也在寻找下一份实习，希望能够参与到像 <a href='https://www.granola.ai/' target='_blank'>Granola</a>  (我最喜欢的 AI 产品)这样的产品团队中，遇见志同道合的人！",
      "曾在与爱为舞参与其 AI 教育产品的打磨工作，非常开心看到自己参与打磨的产品让更多的孩子能够与教师 1 对 1 地交流，受到老师的鼓励与夸赞。",
      "曾在高露洁帮助团队做 HR 重复性事务的自动化，也探索了 AI 在招聘流程中的应用，养成了受用一生的好习惯：好好写邮件（的正文和主题）！",
      "非常幸运在过往两段实习中都遇到了特别 Nice 的同事和上司，感谢这一路上遇见的所有人！"
    ],
    bioEn: [
      "I'm currently pursuing a Master's in Applied Statistics at Beijing Normal University, and looking for my next internship — hoping to join a product team like <a href='https://www.granola.ai/' target='_blank'>Granola</a> (my favorite AI product) and meet kindred spirits along the way.",
      "At Yu'ai Weiwu I helped polish an AI-driven education product, and was lucky to see what we built bring more children real one-on-one time with a teacher — and the encouragement that comes with it.",
      "At Colgate I helped automate the team's repetitive HR work and explored where AI fits into recruiting — and picked up a habit I'll keep for life: write good emails (subject AND body!).",
      "I've been lucky to work alongside kind, generous teammates and managers across both internships — grateful for everyone I've crossed paths with along the way."
    ],
    socialLinks: [
      { name: "微信", nameEn: "WeChat", type: "tooltip", tooltipType: "text", tooltipContent: "Lovego_od" },
      { name: "MBTI", nameEn: "MBTI", type: "tooltip", tooltipType: "text", tooltipContent: "ENTP" },
      { name: "GitHub", nameEn: "GitHub", type: "link", url: "https://github.com/IceyOrange" },
      { name: "Email", nameEn: "Email", type: "link", url: "mailto:uasgwr@gmail.com" },
      { name: "小红书", nameEn: "Xiaohongshu", type: "tooltip", tooltipType: "image", tooltipContent: "assets/images/xiaohongshu-qr.jpg", tooltipDirection: "right" }
    ],
  },

  navMappings: {
    keys: [
      { note: "C3", label: "portfolio", href: "portfolio.html" },
      { note: "G3", label: "experience", href: "experience.html" },
      { note: "B3", label: "about", href: "about.html" },
    ],
    pageToNote: {
      "portfolio.html": "C3",
      "experience.html": "G3",
      "about.html": "B3",
    },
    variants: {
      "portfolio.html": "circle-reveal",
      "experience.html": "circle-reveal",
      "about.html": "circle-reveal",
    },
  },
};
