import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 테스트용 팀 생성
  const team = await prisma.team.create({
    data: {
      name: "테스트 팀",
      owner: "test-user",
      members: ["test-user", "test-member-1", "test-member-2"]
    }
  })

  // 테스트용 프로젝트 생성
  const project = await prisma.project.create({
    data: {
      name: "테스트 프로젝트",
      description: "프로젝트 관리 시스템 테스트를 위한 프로젝트입니다.",
      status: "active",
      startDate: new Date(),
      teamId: team.id,
      metadata: {
        priority: "medium",
        category: "개발",
        tags: ["테스트", "개발", "프로젝트"]
      }
    }
  })

  // 테스트용 룸 생성
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        name: "기획",
        description: "프로젝트 기획 및 요구사항 정의",
        projectId: project.id,
        createdBy: "test-user"
      }
    }),
    prisma.room.create({
      data: {
        name: "디자인",
        description: "UI/UX 디자인 및 프로토타입",
        projectId: project.id,
        createdBy: "test-user"
      }
    }),
    prisma.room.create({
      data: {
        name: "개발",
        description: "프론트엔드 및 백엔드 개발",
        projectId: project.id,
        createdBy: "test-user"
      }
    })
  ])

  // 테스트용 작업 생성
  await Promise.all(
    rooms.map(room =>
      prisma.task.create({
        data: {
          title: `${room.name} 관련 작업`,
          description: `${room.name} 룸의 테스트 작업입니다.`,
          status: "todo",
          priority: "medium",
          roomId: room.id,
          assignee: "test-user"
        }
      })
    )
  )

  // 테스트용 문서 생성
  await Promise.all(
    rooms.map(room =>
      prisma.document.create({
        data: {
          title: `${room.name} 문서`,
          content: `${room.name} 룸의 테스트 문서입니다.`,
          roomId: room.id,
          createdBy: "test-user"
        }
      })
    )
  )

  // 테스트용 토론 생성
  await Promise.all(
    rooms.map(room =>
      prisma.discussion.create({
        data: {
          title: `${room.name} 관련 토론`,
          content: `${room.name} 룸의 테스트 토론입니다.`,
          roomId: room.id,
          createdBy: "test-user"
        }
      })
    )
  )

  console.log("시드 데이터 생성 완료")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 