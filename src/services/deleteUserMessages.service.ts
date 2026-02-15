import prisma from "../utils/prismaClient.js";

const deleteUserMessages = async (userId: string) => {
    await prisma.message.deleteMany({
        where: {
            OR: [
                { fromUserId: userId },
                { toUserId: userId },
            ],
        },
    });
};

export default deleteUserMessages;
