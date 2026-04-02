/**
 * Copyright (C) 2016-2026 Husain Alamri (H4n) and Xenolexia Foundation.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See LICENSE.
 */

import rnVersion from 'react-native/Libraries/Core/ReactNativeVersion';

const minor = rnVersion && typeof rnVersion.minor === 'number' ? rnVersion.minor : undefined;
if (typeof minor === 'number' && (minor < 74 || minor > 84)) {
  console.warn(
    `[Word-Building Puzzle] React Native 0.${minor}.x is outside the supported semver-minor band (74–84).`,
  );
}
