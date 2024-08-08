const TABLE: &str = "\
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn encode(bytes: &[u8], size: usize) -> String {
    let mut buffer = Vec::<char>::new();
    buffer.resize((size + 2) / 3 * 4, '=');
    let mut i = 0;
    let mut j = 0;
    let n = size / 3 * 3;
    while i < n {
      let x: u32 = ((bytes[i] as u32) << 16)
        | ((bytes[i + 1] as u32) << 8)
        | (bytes[i + 2] as u32);
      buffer[j] = TABLE.chars().nth(((x >> 18) & 63) as usize).unwrap();
      buffer[j + 1] = TABLE.chars().nth(((x >> 12) & 63) as usize).unwrap();
      buffer[j + 2] = TABLE.chars().nth(((x >> 6) & 63) as usize).unwrap();
      buffer[j + 3] = TABLE.chars().nth((x & 63) as usize).unwrap();
      i += 3;
      j += 4;
    }
    if i + 1 == size {
      let x = (bytes[i] as u32) << 16;
      buffer[j] = TABLE.chars().nth(((x >> 18) & 63) as usize).unwrap();
      buffer[j + 1] = TABLE.chars().nth(((x >> 12) & 63) as usize).unwrap();
    } else if i + 2 == size {
      let x = (bytes[i] as u32) << 16 | (bytes[i + 1] as u32) << 8;
      buffer[j] = TABLE.chars().nth(((x >> 18) & 63) as usize).unwrap();
      buffer[j + 1] = TABLE.chars().nth(((x >> 12) & 63) as usize).unwrap();
      buffer[j + 2] = TABLE.chars().nth(((x >> 6) & 63) as usize).unwrap();
    }
    buffer.iter().collect()
}