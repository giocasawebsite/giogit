import { GamingResource, GameItem, EquipmentSummary } from '../types';
import { buildApiUrl } from './apiConfig';

class EquipmentApiClient {
  private getHeaders(passcode?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (passcode) {
      headers['x-admin-passcode'] = passcode;
      headers['Authorization'] = `Bearer ${passcode}`;
    }
    return headers;
  }

  // ==========================================
  // EQUIPMENT OPERATIONS
  // ==========================================

  async getEquipmentSummary(passcode: string): Promise<{ summary: EquipmentSummary[]; resources: GamingResource[] }> {
    const url = buildApiUrl('/admin/equipment');
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(passcode),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch equipment: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async getAllResources(passcode: string): Promise<GamingResource[]> {
    const url = buildApiUrl('/admin/resources');
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(passcode),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch resources: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async createEquipment(passcode: string, data: Partial<GamingResource>): Promise<GamingResource> {
    const url = buildApiUrl('/admin/equipment');
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create equipment: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async updateEquipment(passcode: string, id: string, data: Partial<GamingResource>): Promise<GamingResource> {
    const url = buildApiUrl(`/admin/equipment/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update equipment: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async toggleMaintenance(
    passcode: string,
    id: string,
    isMaintenance: boolean,
    maintenanceReason?: string
  ): Promise<GamingResource> {
    const url = buildApiUrl(`/admin/resources/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(passcode),
      body: JSON.stringify({ isMaintenance, maintenanceReason: maintenanceReason || '' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to toggle maintenance: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async deleteEquipment(passcode: string, id: string): Promise<{ success: boolean; error?: string; activeBookingsCount?: number }> {
    const url = buildApiUrl(`/admin/equipment/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(passcode),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: json.error || `Failed to delete equipment: ${res.statusText}`,
        activeBookingsCount: json.activeBookingsCount,
      };
    }

    return { success: true };
  }

  async adjustQuantity(
    passcode: string,
    category: string,
    delta: number,
    templateData?: any
  ): Promise<{ success: boolean; resource?: GamingResource; error?: string; activeBookingsCount?: number }> {
    const url = buildApiUrl('/admin/equipment/quantity');
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify({ category, delta, templateData }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: json.error || `Failed to adjust quantity: ${res.statusText}`,
        activeBookingsCount: json.activeBookingsCount,
      };
    }

    return { success: true, resource: json.data };
  }

  // ==========================================
  // GAMES OPERATIONS
  // ==========================================

  async getAdminGames(passcode: string, category?: string): Promise<GameItem[]> {
    const url = buildApiUrl('/admin/games', { category });
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(passcode),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch games: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async getPublicGames(category?: string): Promise<GameItem[]> {
    const url = buildApiUrl('/booking/games', { category });
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch public games: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async createGame(passcode: string, data: Partial<GameItem>): Promise<GameItem> {
    const url = buildApiUrl('/admin/games');
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create game: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async updateGame(passcode: string, id: string, data: Partial<GameItem>): Promise<GameItem> {
    const url = buildApiUrl(`/admin/games/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(passcode),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update game: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  async deleteGame(passcode: string, id: string): Promise<boolean> {
    const url = buildApiUrl(`/admin/games/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(passcode),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete game: ${res.statusText}`);
    }

    const json = await res.json();
    return Boolean(json.success);
  }
}

export const equipmentApi = new EquipmentApiClient();
