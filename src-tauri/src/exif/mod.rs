pub mod brand;

use std::{fs::File, io::BufReader, path::Path};

use exif::{In, Reader, Tag, Value};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraInfo {
    pub make: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpsInfo {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifData {
    pub camera: CameraInfo,
    pub lens: String,
    pub iso: u32,
    pub aperture: f64,
    pub shutter_speed: String,
    pub focal_length: f64,
    pub taken_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gps: Option<GpsInfo>,
}

impl Default for ExifData {
    fn default() -> Self {
        Self {
            camera: CameraInfo {
                make: String::new(),
                model: String::new(),
            },
            lens: String::new(),
            iso: 0,
            aperture: 0.0,
            shutter_speed: String::new(),
            focal_length: 0.0,
            taken_at: String::new(),
            gps: None,
        }
    }
}

pub fn read_exif(path: &Path) -> ExifData {
    let Ok(file) = File::open(path) else {
        return ExifData::default();
    };
    let mut reader = BufReader::new(file);
    let Ok(exif) = Reader::new().read_from_container(&mut reader) else {
        return ExifData::default();
    };

    let mut data = ExifData::default();

    data.camera.make = text_field(&exif, Tag::Make);
    data.camera.model = text_field(&exif, Tag::Model);
    data.lens = text_field(&exif, Tag::LensModel);
    data.iso = rational_u32(&exif, Tag::PhotographicSensitivity)
        .or_else(|| rational_u32(&exif, Tag::ISOSpeed))
        .unwrap_or(0);
    data.aperture = rational_f64(&exif, Tag::FNumber).unwrap_or(0.0);
    data.focal_length = rational_f64(&exif, Tag::FocalLength).unwrap_or(0.0);
    data.shutter_speed =
        text_field(&exif, Tag::ExposureTime).replace(" sec.", "s");
    data.taken_at = text_field(&exif, Tag::DateTimeOriginal);
    data.gps = gps(&exif);

    data
}

fn extract_ascii(value: &Value) -> String {
    if let Value::Ascii(parts) = value {
        return parts
            .iter()
            .find_map(|p| {
                let s: Vec<u8> = p.iter().copied().take_while(|&b| b != 0).collect();
                let text = String::from_utf8_lossy(&s).trim().to_string();
                if text.is_empty() { None } else { Some(text) }
            })
            .unwrap_or_default();
    }
    String::new()
}

fn text_field(exif: &exif::Exif, tag: Tag) -> String {
    let Some(field) = exif.get_field(tag, In::PRIMARY) else {
        return String::new();
    };
    if let Value::Ascii(_) = &field.value {
        return extract_ascii(&field.value);
    }
    field.display_value().with_unit(exif).to_string().trim().trim_matches('"').to_string()
}


fn rational_f64(exif: &exif::Exif, tag: Tag) -> Option<f64> {
    let field = exif.get_field(tag, In::PRIMARY)?;
    match &field.value {
        Value::Rational(values) if !values.is_empty() => {
            let value = values[0];
            Some(value.num as f64 / value.denom as f64)
        }
        Value::SRational(values) if !values.is_empty() => {
            let value = values[0];
            Some(value.num as f64 / value.denom as f64)
        }
        _ => None,
    }
}

fn rational_u32(exif: &exif::Exif, tag: Tag) -> Option<u32> {
    let field = exif.get_field(tag, In::PRIMARY)?;
    match &field.value {
        Value::Short(values) if !values.is_empty() => Some(values[0] as u32),
        Value::Long(values) if !values.is_empty() => Some(values[0]),
        Value::Rational(values) if !values.is_empty() => {
            let value = values[0];
            Some(value.num / value.denom)
        }
        _ => None,
    }
}

fn gps(exif: &exif::Exif) -> Option<GpsInfo> {
    let lat = gps_coord(exif, Tag::GPSLatitude, Tag::GPSLatitudeRef)?;
    let lng = gps_coord(exif, Tag::GPSLongitude, Tag::GPSLongitudeRef)?;
    Some(GpsInfo { lat, lng })
}

fn gps_coord(exif: &exif::Exif, tag: Tag, ref_tag: Tag) -> Option<f64> {
    let field = exif.get_field(tag, In::PRIMARY)?;
    let ref_field = text_field(exif, ref_tag);
    let values = match &field.value {
        Value::Rational(values) if values.len() >= 3 => values,
        _ => return None,
    };
    let degrees = values[0].num as f64 / values[0].denom as f64;
    let minutes = values[1].num as f64 / values[1].denom as f64;
    let seconds = values[2].num as f64 / values[2].denom as f64;
    let mut result = degrees + minutes / 60.0 + seconds / 3600.0;
    if matches!(ref_field.as_str(), "S" | "W") {
        result *= -1.0;
    }
    Some(result)
}

#[cfg(test)]
mod tests {
    use exif::Value;

    use super::extract_ascii;

    #[test]
    fn nikon_null_padded_lens_model() {
        // Nikon stores lens name as null-padded ASCII — many trailing empty components.
        let parts: Vec<Vec<u8>> = vec![
            b"NIKKOR Z DX 50-250mm f/4.5-6.3 VR".to_vec(),
            vec![],
            vec![],
            vec![],
        ];
        assert_eq!(extract_ascii(&Value::Ascii(parts)), "NIKKOR Z DX 50-250mm f/4.5-6.3 VR");
    }

    #[test]
    fn null_bytes_within_component_are_stripped() {
        let parts: Vec<Vec<u8>> = vec![b"NIKON Z fc\0\0\0\0".to_vec()];
        assert_eq!(extract_ascii(&Value::Ascii(parts)), "NIKON Z fc");
    }
}
