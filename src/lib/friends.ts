import { getDisplayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function getFriendPairKey(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join(":");
}

const userSelect = {
  id: true,
  name: true,
  nickname: true,
  displayNameMode: true,
  email: true,
  role: true,
} as const;

export async function getFriendDashboard(userId: string) {
  const [incomingRequests, outgoingRequests, acceptedRequests] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: { sender: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      include: { receiver: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    incomingRequests: incomingRequests.map((request) => ({
      id: request.id,
      createdAt: request.createdAt,
      user: request.sender,
      displayName: getDisplayName(request.sender),
    })),
    outgoingRequests: outgoingRequests.map((request) => ({
      id: request.id,
      createdAt: request.createdAt,
      user: request.receiver,
      displayName: getDisplayName(request.receiver),
    })),
    friends: acceptedRequests.map((request) => {
      const friend = request.senderId === userId ? request.receiver : request.sender;

      return {
        id: request.id,
        user: friend,
        displayName: getDisplayName(friend),
      };
    }),
  };
}

export async function getAcceptedFriendIds(userId: string) {
  const acceptedRequests = await prisma.friendRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: { senderId: true, receiverId: true },
  });

  return acceptedRequests.map((request) =>
    request.senderId === userId ? request.receiverId : request.senderId,
  );
}
