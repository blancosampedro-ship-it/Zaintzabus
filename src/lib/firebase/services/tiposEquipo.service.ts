import type { Firestore } from 'firebase/firestore';
import type { TipoEquipo, ConfigCamposTipoEquipo } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';

export class TiposEquipoService extends BaseFirestoreService<TipoEquipo> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      return `tenants/${ctx.tenantId}/tiposEquipo`;
    });
  }

  async getCamposConfig(ctx: ServiceContext, tipoEquipoId: string): Promise<ConfigCamposTipoEquipo | null> {
    const tipo = await this.getById(ctx, tipoEquipoId);
    return tipo?.campos ?? null;
  }
}
