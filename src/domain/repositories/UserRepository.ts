import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export class UserRepository {
  private mapUser(user: any) {
    if (!user) return null;
    return {
      ...user,
      id: user.seqid.toString()
    };
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return this.mapUser(user);
  }

  async findById(id: string) {
    try {
      const seqid = BigInt(id);
      return await this.findBySeqId(seqid);
    } catch {
      return await this.findByEmail(id);
    }
  }

  async findBySeqId(seqid: bigint) {
    const user = await prisma.user.findUnique({
      where: { seqid }
    });
    return this.mapUser(user);
  }

  async createUser(data: { name: string; email: string; image?: string }) {
    const user = await prisma.user.create({ data });
    return this.mapUser(user);
  }

  async getWorkspaceMembers(workspaceSeqid: bigint) {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceSeqid },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });
    return members.map(m => this.mapUser(m.user));
  }

  async getLoggedUser() {
    const session = await getSession();
    if (session) {
      const user = await this.findBySeqId(BigInt(session.userSeqId));
      if (user) return user;
    }
    throw new Error('Não autorizado. Por favor, faça login.');
  }
}
