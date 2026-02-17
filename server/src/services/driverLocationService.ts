import Driver from '../models/Driver';
import DriverLocation from '../models/DriverLocation';

export class DriverLocationService {
  async reportLocation(params: { driver_id: number; latitude: number; longitude: number; accuracy?: number }) {
    const location = await DriverLocation.create({
      driver_id: params.driver_id,
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      accuracy: params.accuracy != null ? String(params.accuracy) : undefined
    });

    await Driver.update({ last_location_id: location.id }, { where: { id: params.driver_id } });
    return location;
  }

  async listApprovedAvailableWithLatestLocation() {
    const drivers = await Driver.findAll({
      where: { status: 'approved', is_available: true }
    });

    const locationIds = drivers.map((d) => d.last_location_id).filter((x): x is number => typeof x === 'number');
    const locations = locationIds.length
      ? await DriverLocation.findAll({ where: { id: locationIds } })
      : [];
    const locationMap = new Map(locations.map((l) => [l.id, l]));

    return drivers
      .map((d) => {
        const loc = d.last_location_id ? locationMap.get(d.last_location_id) : undefined;
        return {
          driver: d,
          location: loc
        };
      })
      .filter((x) => Boolean(x.location));
  }
}

export default new DriverLocationService();

