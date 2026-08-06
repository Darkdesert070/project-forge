import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Seeding PROJECT FORGE...');

  // Clean slate — cascades remove all dependent records.
  // Users are no longer owned by a workspace, so deleting workspaces alone
  // would leave orphaned accounts behind. Both are cleared explicitly.
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Meridian Engineering',
      slug: 'meridian-engineering',
      // Published so the public directory is demonstrable out of the box.
      // Workspaces created through the application are private by default.
      isPublic: true,
      tagline: 'Precision mechanical and controls engineering for heavy industry.',
    },
  });

  const people = [
    { name: 'Ava Thompson', email: 'admin@forge.dev', role: 'ADMIN' },
    { name: 'Liam Chen', email: 'liam@forge.dev', role: 'MEMBER' },
    { name: 'Sofia Reyes', email: 'sofia@forge.dev', role: 'MEMBER' },
    { name: 'Noah Patel', email: 'noah@forge.dev', role: 'MEMBER' },
    { name: 'Mia Alvarez', email: 'mia@forge.dev', role: 'MEMBER' },
  ];

  const users = [];
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    users.push(
      await prisma.user.create({
        data: {
          name: p.name,
          email: p.email,
          passwordHash,
          avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
          memberships_ws: {
            create: { workspaceId: workspace.id, role: p.role },
          },
        },
      }),
    );
  }
  const [admin, liam, sofia, noah, mia] = users;

  type ProjectSeed = {
    name: string;
    description: string;
    client: string;
    manager: { id: string };
    status: string;
    priority: string;
    startDate: Date;
    endDate: Date;
    tags: string[];
    members: { id: string }[];
    milestones: {
      title: string;
      description: string;
      dueDate: Date;
      progress: number;
      status: string;
      priority: string;
      assignee: { id: string };
    }[];
    reviews: { title: string; reviewer: { id: string }; decision: string; comments: string }[];
    clarifications: {
      question: string;
      answer: string;
      status: string;
      priority: string;
      author: { id: string };
      assignee: { id: string };
    }[];
    evidence: { title: string; type: string; url: string; description: string; uploader: { id: string } }[];
  };

  const projectSeeds: ProjectSeed[] = [
    {
      name: 'Turbine Blade Redesign',
      description:
        'Aerodynamic redesign of the Gen-4 turbine blade to improve efficiency by 12% while reducing material fatigue.',
      client: 'Aurora Power Systems',
      manager: liam,
      status: 'ACTIVE',
      priority: 'HIGH',
      startDate: daysFromNow(-40),
      endDate: daysFromNow(35),
      tags: ['aerospace', 'CFD', 'fatigue'],
      members: [liam, sofia, noah],
      milestones: [
        {
          title: 'Concept & Requirements',
          description: 'Lock down aero targets and material constraints.',
          dueDate: daysFromNow(-25),
          progress: 100,
          status: 'COMPLETED',
          priority: 'HIGH',
          assignee: sofia,
        },
        {
          title: 'CFD Simulation Round 1',
          description: 'Run baseline computational fluid dynamics on 3 candidate profiles.',
          dueDate: daysFromNow(-5),
          progress: 100,
          status: 'COMPLETED',
          priority: 'HIGH',
          assignee: noah,
        },
        {
          title: 'Prototype Tooling',
          description: 'Machine the first physical prototype for wind-tunnel testing.',
          dueDate: daysFromNow(6),
          progress: 55,
          status: 'IN_PROGRESS',
          priority: 'CRITICAL',
          assignee: liam,
        },
        {
          title: 'Wind Tunnel Validation',
          description: 'Validate simulation against physical measurements.',
          dueDate: daysFromNow(28),
          progress: 0,
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          assignee: sofia,
        },
      ],
      reviews: [
        {
          title: 'Aero Profile Design Review',
          reviewer: admin,
          decision: 'APPROVED',
          comments: 'Profile B meets targets. Approved to proceed to tooling.',
        },
        {
          title: 'Material Selection Review',
          reviewer: liam,
          decision: 'PENDING',
          comments: 'Awaiting fatigue test data before sign-off.',
        },
      ],
      clarifications: [
        {
          question: 'Should we optimise for peak efficiency or a broader operating envelope?',
          answer: 'Prioritise the broader envelope — the client runs variable load.',
          status: 'ANSWERED',
          priority: 'HIGH',
          author: noah,
          assignee: liam,
        },
        {
          question: 'What is the max allowable blade tip deflection under load?',
          answer: '',
          status: 'OPEN',
          priority: 'MEDIUM',
          author: sofia,
          assignee: admin,
        },
      ],
      evidence: [
        {
          title: 'CFD Round 1 Report',
          type: 'SIMULATION',
          url: 'https://example.com/reports/cfd-round-1.pdf',
          description: 'Full simulation dataset and summary.',
          uploader: noah,
        },
        {
          title: 'Blade Profile CAD',
          type: 'CAD',
          url: 'https://drive.google.com/file/blade-profile',
          description: 'STEP files for candidate profiles A–C.',
          uploader: liam,
        },
      ],
    },
    {
      name: 'Bridge Load Monitoring IoT',
      description:
        'Design and deploy a network of strain-gauge IoT sensors for real-time structural health monitoring of the Kestrel overpass.',
      client: 'Dept. of Transport',
      manager: sofia,
      status: 'ACTIVE',
      priority: 'CRITICAL',
      startDate: daysFromNow(-70),
      endDate: daysFromNow(15),
      tags: ['civil', 'IoT', 'sensors', 'safety'],
      members: [sofia, mia, noah],
      milestones: [
        {
          title: 'Sensor Selection',
          description: 'Evaluate strain gauge vendors and comms protocol.',
          dueDate: daysFromNow(-50),
          progress: 100,
          status: 'COMPLETED',
          priority: 'HIGH',
          assignee: mia,
        },
        {
          title: 'Field Installation',
          description: 'Mount and calibrate 48 sensor nodes.',
          dueDate: daysFromNow(-2),
          progress: 80,
          status: 'DELAYED',
          priority: 'CRITICAL',
          assignee: noah,
        },
        {
          title: 'Dashboard Integration',
          description: 'Stream telemetry into the monitoring dashboard.',
          dueDate: daysFromNow(10),
          progress: 30,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignee: sofia,
        },
      ],
      reviews: [
        {
          title: 'Installation Safety Review',
          reviewer: admin,
          decision: 'PENDING',
          comments: 'Reviewing fall-protection plan for span works.',
        },
      ],
      clarifications: [
        {
          question: 'Do we need redundant power for the sensor gateways?',
          answer: '',
          status: 'OPEN',
          priority: 'CRITICAL',
          author: noah,
          assignee: sofia,
        },
      ],
      evidence: [
        {
          title: 'Sensor Placement Plan',
          type: 'PDF',
          url: 'https://example.com/reports/sensor-placement.pdf',
          description: 'Annotated placement diagram for all nodes.',
          uploader: mia,
        },
      ],
    },
    {
      name: 'EV Battery Thermal System',
      description:
        'Develop a liquid-cooled thermal management system for the next-gen EV battery pack to keep cells within a 15–35°C window.',
      client: 'Volt Mobility',
      manager: noah,
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: daysFromNow(-8),
      endDate: daysFromNow(90),
      tags: ['automotive', 'thermal', 'battery'],
      members: [noah, mia],
      milestones: [
        {
          title: 'Thermal Requirements',
          description: 'Define worst-case thermal loads and targets.',
          dueDate: daysFromNow(9),
          progress: 20,
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          assignee: mia,
        },
        {
          title: 'Cooling Loop Concept',
          description: 'Draft cold-plate and coolant routing concepts.',
          dueDate: daysFromNow(25),
          progress: 0,
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          assignee: noah,
        },
      ],
      reviews: [],
      clarifications: [
        {
          question: 'Is glycol-water mix acceptable or do we need dielectric coolant?',
          answer: 'Glycol-water is fine for the MVP; revisit for production.',
          status: 'CLOSED',
          priority: 'LOW',
          author: mia,
          assignee: noah,
        },
      ],
      evidence: [],
    },
    {
      name: 'Hydraulic Press Retrofit',
      description:
        'Retrofit the legacy 500-ton hydraulic press with modern PLC control and safety interlocks.',
      client: 'Ironforge Manufacturing',
      manager: liam,
      status: 'COMPLETED',
      priority: 'LOW',
      startDate: daysFromNow(-120),
      endDate: daysFromNow(-10),
      tags: ['mechanical', 'PLC', 'safety'],
      members: [liam, mia],
      milestones: [
        {
          title: 'Controls Upgrade',
          description: 'Replace relay logic with PLC.',
          dueDate: daysFromNow(-40),
          progress: 100,
          status: 'COMPLETED',
          priority: 'MEDIUM',
          assignee: liam,
        },
        {
          title: 'Safety Certification',
          description: 'Pass third-party safety audit.',
          dueDate: daysFromNow(-12),
          progress: 100,
          status: 'COMPLETED',
          priority: 'HIGH',
          assignee: mia,
        },
      ],
      reviews: [
        {
          title: 'Final Acceptance Review',
          reviewer: admin,
          decision: 'APPROVED',
          comments: 'All interlocks verified. Signed off for return to service.',
        },
      ],
      clarifications: [],
      evidence: [
        {
          title: 'Safety Audit Certificate',
          type: 'DOCUMENT',
          url: 'https://example.com/certs/safety-audit.pdf',
          description: 'Signed certificate of compliance.',
          uploader: mia,
        },
      ],
    },
  ];

  for (const seed of projectSeeds) {
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: seed.name,
        description: seed.description,
        client: seed.client,
        managerId: seed.manager.id,
        status: seed.status,
        priority: seed.priority,
        startDate: seed.startDate,
        endDate: seed.endDate,
        tags: JSON.stringify(seed.tags),
        members: { create: seed.members.map((m) => ({ userId: m.id })) },
        milestones: {
          create: seed.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            dueDate: m.dueDate,
            progress: m.progress,
            status: m.status,
            priority: m.priority,
            assigneeId: m.assignee.id,
          })),
        },
        reviews: {
          create: seed.reviews.map((r) => ({
            title: r.title,
            reviewerId: r.reviewer.id,
            decision: r.decision,
            comments: r.comments,
          })),
        },
        clarifications: {
          create: seed.clarifications.map((c) => ({
            question: c.question,
            answer: c.answer,
            status: c.status,
            priority: c.priority,
            authorId: c.author.id,
            assigneeId: c.assignee.id,
            answeredAt: c.status !== 'OPEN' ? daysFromNow(-3) : null,
          })),
        },
        evidence: {
          create: seed.evidence.map((e) => ({
            title: e.title,
            type: e.type,
            url: e.url,
            description: e.description,
            uploaderId: e.uploader.id,
          })),
        },
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        projectId: project.id,
        userId: seed.manager.id,
        action: 'project.created',
        entityType: 'project',
        entityId: project.id,
        meta: JSON.stringify({ name: project.name }),
      },
    });
  }

  // A few notifications for the admin so the bell is populated.
  await prisma.notification.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: admin.id,
        type: 'REVIEW_SUBMITTED',
        title: 'Review submitted',
        message: 'Installation Safety Review is awaiting your decision',
        link: '/projects',
      },
      {
        workspaceId: workspace.id,
        userId: admin.id,
        type: 'CLARIFICATION_OPENED',
        title: 'New clarification',
        message: 'Redundant power for sensor gateways?',
        link: '/projects',
      },
    ],
  });

  console.log('✅ Seed complete.');
  console.log(`   Workspace: ${workspace.name}`);
  console.log(`   Login as admin:  admin@forge.dev / ${DEMO_PASSWORD}`);
  console.log(`   Login as member: liam@forge.dev / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
