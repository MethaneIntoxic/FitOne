export type DeviceProfileId = "desktop-chrome" | "mobile-pixel-7";

export type DeviceFormFactor = "desktop" | "mobile";

export interface DeviceProfileFixture {
  id: DeviceProfileId;
  label: string;
  formFactor: DeviceFormFactor;
  playwrightDeviceName: string;
  viewport: {
    width: number;
    height: number;
  };
}

const DEVICE_PROFILES: Record<DeviceProfileId, DeviceProfileFixture> = {
  "desktop-chrome": {
    id: "desktop-chrome",
    label: "Desktop Chrome 1280x720",
    formFactor: "desktop",
    playwrightDeviceName: "Desktop Chrome",
    viewport: {
      width: 1280,
      height: 720,
    },
  },
  "mobile-pixel-7": {
    id: "mobile-pixel-7",
    label: "Pixel 7",
    formFactor: "mobile",
    playwrightDeviceName: "Pixel 7",
    viewport: {
      width: 412,
      height: 915,
    },
  },
};

export const deviceProfiles: DeviceProfileFixture[] = Object.values(DEVICE_PROFILES);

export function getDeviceProfile(profileId: DeviceProfileId): DeviceProfileFixture {
  return DEVICE_PROFILES[profileId];
}

export function isDeviceProfileId(value: string): value is DeviceProfileId {
  return value in DEVICE_PROFILES;
}
