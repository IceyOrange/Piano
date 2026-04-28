window.PianoApp = window.PianoApp || {};

window.PianoApp.data = {
  projects: [
    {
      id: "1",
      name: "一个能弹琴的 Landing Page",
      description: "灵感源自 Pinterest 上看到的<a href='https://pin.it/FAAK2mtJ5' target='_blank'>钢琴</a>和<a href='https://pin.it/5Ww8Bq78A' target='_blank'>曲谱小猫</a>，以及 Kimi <a href='https://www.kimi.com/membership/pricing' target='_blank'>会员订阅页</a>底部的曲谱。设计真实钢琴演奏交互；通过长按琴键触发子页面跳转；还有致敬 Beatles 的动画和乐谱上会弹钢琴的小猫，快点击试试吧。",
      year: "2026",
      category: "Creative",
      image: "assets/images/piano.png",
      tech: ["Vibe Coding", "音乐", "乐队"],
      link: "https://www.lovegood.cool",
    },
    {
      id: "2",
      name: "Blue Sky & White Cloud",
      description: "灵感源于 @baothiento 的<a href='https://x.com/baothiento/status/2033203600298488136?s=20' target='_blank'>池塘</a>和张悬的<a href='https://music.163.com/#/song?id=326697' target='_blank'>《蓝天白云》</a><br>向下滚动由白天滑入星空——白天点击放飞飞鸟、微风落叶；夜晚点击流星触发漫天星雨，探索星座连线，还有机会看见稀有的彗星！",
      year: "2026",
      category: "Creative",
      image: "assets/images/BlueSkyWhiteCloud.jpg",
      tech: ["Vibe Coding", "星空", "自然"],
      link: "BlueSkyWhiteCloud.html",
    }
  ],

  experiences: [
    {
      id: "1",
      orgName: "北京师范大学",
      orgLocation: "珠海",
      tags: ["985", "双一流"],
      position: "应用统计 · 硕士",
      startDate: "2025-09",
      endDate: null,
      roles: [
        {
          titleZh: "学业表现",
          titleEn: "Academic Performance",
          description: "GPA 3.6/4.0，主要课程：深度学习、回归分析、多元统计分析、广义线性模型、教育测量、心理发展与教育、课程与教学。"
        },
        {
          titleZh: "校园经历",
          titleEn: "Campus Involvement",
          description: "策划组织 2 场班级文艺晚会、世界阅读日读书分享等活动，提升班级凝聚力，有效带动校运会报名，参与人数达全班1/5"
        }
      ]
    },
    {
      id: "2",
      orgName: "北京与爱为舞科技有限公司",
      orgLocation: "北京",
      tags: ["K12 AI 教育", "独角兽"],
      position: "产品经理 · 实习",
      startDate: "2025-06",
      endDate: "2025-09",
      roles: [
        {
          titleZh: "C 端核心体验优化",
          titleEn: "C-End Experience",
          description: "产品上线初期，因交互认知偏差和音视频体验问题产生大量负面反馈。针对高频问题（如麦克风图标误触、数字人-视频切换生硬、退出重进后重复上课、音画不同步等），设计并推动上线辅助文字提示、蒙版遮罩过渡、断点续学机制、数字人推流优化等方案，相关用户反馈频次降低 90%；初步设计数据埋点、分析方案，为产品决策提供数据支撑。"
        },
        {
          titleZh: "B 端运营效率工具建设",
          titleEn: "B-End Efficiency",
          description: "针对设计团队板书制作负担重问题，推动上线智能板书功能，提升设计团队生产效率；针对非技术背景销售排课系统学习成本高问题，对高频场景设计常用体验课排课模板，简化配课流程，提升销售工作效率。"
        },
        {
          titleZh: "AI 技术选型与个性化策略",
          titleEn: "AI & Personalization",
          description: "<ul><li><strong>AI 生成板书</strong>：在智能板书的基础上，更近一步地构想通过 AI 赋能板书生成过程。搭建评估调研框架，对 Midjourney、可灵、Gemini Storybook 等 AI 图片生成工具的结构化板书生成效果进行系统评测。</li><li><strong>ASR 语音识别</strong>：针对数字人在交互时“答非所问”的情况，建立评估体系，评估自研、火山、MiniMax 等平台的 ASR 效果。</li><li><strong>个性化学习</strong>：为赋予 AI 数字人更科学、更有效的“千人千面，因材施教”个性化施教能力，从「学生测度、题目测度、知识图谱和推荐算法」四个维度进行调研，协助制定产品长远期个性化学习实现策略。</li></ul>"
        }
      ]
    },
    {
      id: "3",
      orgName: "高露洁棕榄(中国)有限公司",
      orgLocation: "广州",
      tags: ["世界 500 强", "快消"],
      position: "数字化专员 · 实习",
      startDate: "2024-03",
      endDate: "2024-09",
      roles: [
        {
          titleZh: "HR 流程自动化与效能提升",
          titleEn: "HR Automation",
          description: "针对 HR 部门在招聘、入离职、档案管理等场景的重复性的手动操作（如跨平台复制候选人信息、员工资料核对与移动归档、开具证明等）设计 RPA 自动化解决方案，并基于 ShadowBot、Apps Script、Python 进行开发落地。覆盖一键生成证明、招聘端自动回复、候选人信息抓取，为部门同事节省时间成本日均 30min+。"
        },
        {
          titleZh: "AI 赋能 HR 招聘流程",
          titleEn: "AI empowers recruitment process",
          description: "针对招聘流程中简历初筛效率低的问题，设计基于 RAG 的 AI 候选人评估辅助系统，并基于 Python 与大模型 API 接口开发，对候选人简历进行语义解析与岗位匹配度评估，实现自动筛选和生成评估建议，提升简历初筛效率."
        }
      ]
    },
    {
      id: "4",
      orgName: "广州大学",
      orgLocation: "广州",
      tags: ["111 计划"],
      position: "统计学 · 本科",
      startDate: "2021-09",
      endDate: "2025-06",
      roles: [
        {
          titleZh: "学业表现",
          titleEn: "Academic Performance",
          description: "GPA 3.5/4.0，专业课《统计学概论》成绩专业第一。曾获校级一等、三等奖学金，校优秀学生、校优秀毕业生。主要课程：概率论与数理统计、机器学习、数据挖掘、数据可视化 (Tableau)、Python 程序设计、统计软件-R。"
        },
        {
          titleZh: "校园经历",
          titleEn: "Campus Involvement",
          description: "<ul><li>担任<strong>广州大学学生天文爱好者协会执行会长</strong>：对接、组织校内外天文科普活动; 担任并培养校天象馆四季星空讲解员; 组织特殊天象(如流星雨、日月食、超级月亮等)观测；</li><li>担任<strong>广州大学学生软件技术应用协会会长</strong>：定期开展协会成员技术交流与培训; 定期开展讲座(如Windows、Office使用技巧等); 每周值班或上门为师生解决软件问题。</li></ul>"
        },
        {
          titleZh: "竞赛与科研",
          titleEn: "Competitions",
          description: "挑战杯省赛二等奖 & 统计建模大赛省赛二等奖。使用 Python 爬虫抓取沪深上市公司 2010-2021 年报数据，构建企业数字化程度指标。成果转化为 ESCI 期刊 Green Finance (IF=5.5) 论文 <a href='https://www.aimspress.com/article/doi/10.3934/GF.2024019' target='_blank'>(Fu & Xu, 2024)</a>。"
        }
      ]
    },
  ],

  about: {
    name: "黄添成",
    typewriter: [
      "为什么想要成为一名产品经理？",
      "产品会影响人们的生活。而好的产品不是让人离不开它，而是帮人把时间和精力省出来，去享受更重要的事。", 
      "我想做的就是设计这样的产品：它存在的意义，是让人们忘记它，把更多精力还给生活本身。",
      "这也是我想做产品经理的原因：在技术发展迅速的时代，希望自己做的东西，能帮人们给生活多留一些时间 ：）"
    ],
    avatar: "assets/images/avatar.png",
    avatarAlt: "大明星的个人头像",
    bio: [
      "目前正在北师大攻读应用统计硕士学位，同时也在寻找下一份实习，希望能够参与到像 <a href='https://www.granola.ai/' target='_blank'>Granola</a>  (我最喜欢的 AI 产品)这样的产品团队中，遇见志同道合的人！",
      "曾在与爱为舞参与其 AI 教育产品的打磨工作，非常开心看到自己参与打磨的产品让更多的孩子能够与教师 1 对 1 地交流，受到老师的鼓励与夸赞。",
      "曾在高露洁帮助团队做 HR 重复性事务的自动化，也探索了 AI 在招聘流程中的应用，养成了受用一生的好习惯：好好写邮件（的正文和主题）！",
      "非常幸运在过往两段实习中都遇到了特别 Nice 的同事和上司，感谢这一路上遇见的所有人！"
    ],
    socialLinks: [
      { name: "微信", type: "tooltip", tooltipType: "text", tooltipContent: "Lovego_od" },
      { name: "MBTI", type: "tooltip", tooltipType: "text", tooltipContent: "ENTP" },
      { name: "GitHub", type: "link", url: "https://github.com/IceyOrange" },
      { name: "Email", type: "link", url: "mailto:uasgwr@gmail.com" },
      // { name: "bilibili", type: "link", url: ""},
      { name: "小红书", type: "tooltip", tooltipType: "image", tooltipContent: "assets/images/xiaohongshu-qr.jpg" }
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
