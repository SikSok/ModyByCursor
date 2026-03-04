import User from '../models/User';
import DriverLocation from '../models/DriverLocation';

export class DriverLocationService {
  async reportLocation(params: { driver_id: number; latitude: number; longitude: number; accuracy?: number }) {
    const location = await DriverLocation.create({
      driver_id: params.driver_id,
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      accuracy: params.accuracy != null ? String(params.accuracy) : undefined
    });

    await User.update({ last_location_id: location.id }, { where: { id: params.driver_id } });
    return location;
  }

  async listApprovedAvailableWithLatestLocation() {
    const users = await User.findAll({
      where: { driver_status: 'approved', is_available: true }
    });

    const locationIds = users.map((u) => u.last_location_id).filter((x): x is number => typeof x === 'number');
    const locations = locationIds.length
      ? await DriverLocation.findAll({ where: { id: locationIds } })
      : [];
    const locationMap = new Map(locations.map((l) => [l.id, l]));

    return users
      .map((u) => {
        const loc = u.last_location_id ? locationMap.get(u.last_location_id) : undefined;
        return { user: u, location: loc };
      })
      .filter((x): x is { user: User; location: DriverLocation } => Boolean(x.location));
  }
}

export default new DriverLocationService();

