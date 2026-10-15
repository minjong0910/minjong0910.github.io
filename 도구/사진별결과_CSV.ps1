# 사진별 판정 결과를 CSV 로 — 「2026 데이터+AI 혁신 챌린지」 데이터레시피에 올릴 데이터셋
#
#   pwsh -File 도구\사진별결과_CSV.ps1
#
#   site\eval_all.html 의 전체 측정과 똑같은 계산을 C# 으로 다시 한다.
#   측정 페이지는 사진마다의 결과(1위·2위 장소, 유사도, 격차, 정답 여부)를 계산 중에만 들고 있다가
#   합계만 남기고 버린다. 레시피의 「데이터셋 파일(CSV)」에는 사진별 표가 필요해서 만들었다.
#
#   ※ 똑같은 계산인지는 숫자로 확인한다 — 맨 끝에서 발표에 쓰는 값과 대조한다
#     (1,844장 · 자리 55.6% · 층 66.8% · 격차 상위 10% 92.9%/97.8% · 1위 점수 상위 10% 64.7%).
#     2026-10-15 브라우저(공개 측정 페이지)에서 뽑은 같은 표와 SHA-256 이 같은지도 확인했다.
#
#   ※ JS 와 똑같이 맞춘 곳 (어긋나면 동점 처리나 마지막 자리가 달라진다)
#     · 벡터는 float32 로 저장하고, 곱셈·덧셈은 double 로 한다 (Float32Array 를 읽으면 double 이 된다)
#     · 장소 목록의 순서 : JS 객체는 정수 모양 키("13101")를 먼저 오름차순으로, 나머지는 넣은 순서로 둔다.
#       그 순서에서 안정 정렬로 점수 내림차순.
#     · 강의실은 '한 장씩 빼고', 나머지는 '같은 촬영 묶음을 통째로 빼고' 맞힌다.
#
#   개인정보 : 사진 파일 이름과 촬영 묶음 이름(층|계열|기기)은 내보내지 않는다 — P0001·B01 같은 번호로 바꾼다.
param(
  [string]$Out = (Join-Path (Split-Path $PSScriptRoot -Parent) '생성물\사진별_판정결과.csv')
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent

Write-Host '[1] 기준 벡터 읽기 (site\data\aivec.js)'
$raw = [IO.File]::ReadAllText((Join-Path $ROOT 'site\data\aivec.js'), [Text.Encoding]::UTF8)
$s = $raw.IndexOf('{'); $e = $raw.LastIndexOf('}')
$doc = [Text.Json.JsonDocument]::Parse($raw.Substring($s, $e - $s + 1))
$r0 = $doc.RootElement
$D = $r0.GetProperty('dim').GetInt32(); $N = $r0.GetProperty('n').GetInt32()
$q = [Convert]::FromBase64String($r0.GetProperty('q').GetString())
$names = @($r0.GetProperty('names').EnumerateArray() | ForEach-Object { $_.GetString() })
$codes = @($r0.GetProperty('codes').EnumerateArray() | ForEach-Object { $_.GetString() })
Write-Host ("  벡터 {0}개 × {1}차원" -f $N, $D)

$bj = Get-Content (Join-Path $ROOT 'site\batches.json') -Raw -Encoding UTF8 | ConvertFrom-Json -AsHashtable
$batchMap = New-Object 'System.Collections.Generic.Dictionary[string,string]'
foreach($k in $bj.Keys){ $batchMap[$k] = [string]$bj[$k] }
Write-Host ("  촬영 묶음 표 {0}장" -f $batchMap.Count)

Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

public static class Eval {
  static string BatchOf(string name, Dictionary<string,string> map){
    string v; if(map.TryGetValue(name, out v)) return v;
    string floor = name.Split('-')[0];
    var m = Regex.Match(name, @"-([a-z])\d+\.jpg$", RegexOptions.IgnoreCase);
    if(m.Success) return floor + "|" + m.Groups[1].Value.ToLowerInvariant();
    if(Regex.IsMatch(name, @"-\d+\.jpg$")) return floor + "|숫자";
    return floor + "|" + name;
  }
  public static string CatOf(string c){
    if(Regex.IsMatch(c, "^HALL")) return "복도";
    if(Regex.IsMatch(c, "^EVIN")) return "엘리베이터 안";
    if(Regex.IsMatch(c, "^(EV[1-5]|EVB1)$")) return "엘리베이터 앞·로비";
    if(Regex.IsMatch(c, "^LNG[1-5]$")) return "라운지·로비";
    if(Regex.IsMatch(c, "^SIGN")) return "비상대피 안내판";
    if(Regex.IsMatch(c, "^EMS")) return "비상계단";
    if(Regex.IsMatch(c, "^WIN")) return "창밖";
    if(Regex.IsMatch(c, "^WC")) return "화장실";
    if(c == "B1") return "지하 홀";
    if(Regex.IsMatch(c, "^(GATE|ES)")) return "후문·중앙계단";
    if(Regex.IsMatch(c, "^13") || c == "KTC") return "강의실";
    return "기타";
  }
  public static string FloorOf(string c){
    if(c == "B1" || c == "EVB1") return "B";
    if(c == "KTC") return "4";
    if(Regex.IsMatch(c, "^GATE")) return "1";
    var m = Regex.Match(c, "^HALL([1-5])[LR]$");
    if(!m.Success) m = Regex.Match(c, "^13([1-5])");
    if(!m.Success) m = Regex.Match(c, "^(?:EVIN|EMS|SIGN|WIN|LNG|EV|WC|ES)([1-5])");
    return m.Success ? m.Groups[1].Value : "?";
  }
  // JS 의 배열 인덱스 모양 키 : 0 또는 0 으로 시작하지 않는 숫자, 2^32-2 이하
  static bool IsIndexKey(string k, out long v){
    v = 0;
    if(k.Length == 0 || k.Length > 10) return false;
    if(k.Length > 1 && k[0] == '0') return false;
    foreach(char ch in k) if(ch < '0' || ch > '9') return false;
    v = long.Parse(k, CultureInfo.InvariantCulture);
    return v <= 4294967294L;
  }

  public class Row { public string name, code, cat, floor, batch, t1, t2; public double s1, s2, gap; public int e, f; public bool room; }

  public static List<Row> Run(byte[] q, string[] names, string[] codes, Dictionary<string,string> batchMap, int D, int N){
    var V = new float[(long)N * D];
    for(int i = 0; i < N; i++){
      double s = 0;
      for(int j = 0; j < D; j++){ int b = q[(long)i*D + j]; double qq = (b > 127 ? b - 256 : b) / 127.0; V[(long)i*D + j] = (float)qq; s += qq * qq; }
      s = Math.Sqrt(s); if(s == 0) s = 1;
      for(int k = 0; k < D; k++) V[(long)i*D + k] = (float)(V[(long)i*D + k] / s);
    }
    var G = names.Select(n => BatchOf(n, batchMap)).ToArray();
    var photos = new List<(string name, string code, List<int> idx, string g)>();
    var by = new Dictionary<string,int>();
    for(int i = 0; i < N; i++){
      int pi;
      if(!by.TryGetValue(names[i], out pi)){ pi = photos.Count; by[names[i]] = pi; photos.Add((names[i], codes[i], new List<int>(), G[i])); }
      photos[pi].idx.Add(i);
    }
    var isPlate = new bool[N];
    foreach(var p in photos) if(p.idx.Count == 3) isPlate[p.idx[0]] = true;

    var codeBatches = new Dictionary<string,HashSet<string>>(); var cnt = new Dictionary<string,int>();
    foreach(var p in photos){
      HashSet<string> hs; if(!codeBatches.TryGetValue(p.code, out hs)){ hs = new HashSet<string>(); codeBatches[p.code] = hs; }
      hs.Add(p.g); int c0; cnt.TryGetValue(p.code, out c0); cnt[p.code] = c0 + 1;
    }
    var test = photos.Where(p => CatOf(p.code) == "강의실" ? cnt[p.code] > 1 : codeBatches[p.code].Count > 1).ToList();

    var rows = new Row[test.Count];
    Parallel.For(0, test.Count, ti => {
      var p = test[ti]; bool room = CatOf(p.code) == "강의실";
      var own = new HashSet<int>(p.idx);
      var qs = p.idx.Where(x => !isPlate[x]).ToArray();
      var best = new Dictionary<string,double>(); var order = new List<string>();
      for(int i = 0; i < N; i++){
        if(isPlate[i]) continue;
        if(room ? own.Contains(i) : G[i] == p.g) continue;
        double d = -2;
        foreach(int a0 in qs){
          long a = (long)a0 * D, b = (long)i * D; double t = 0;
          for(int j = 0; j < D; j++) t += (double)V[a + j] * (double)V[b + j];
          if(t > d) d = t;
        }
        string c = codes[i]; double old;
        if(!best.TryGetValue(c, out old)){ best[c] = d; order.Add(c); } else if(d > old) best[c] = d;
      }
      // JS 객체 키 순서 : 정수 모양 키 오름차순 → 나머지는 넣은 순서
      var keys = new List<string>();
      var ints = new List<(long v, string k)>(); var strs = new List<string>();
      foreach(var k in order){ long v; if(IsIndexKey(k, out v)) ints.Add((v, k)); else strs.Add(k); }
      keys.AddRange(ints.OrderBy(x => x.v).Select(x => x.k)); keys.AddRange(strs);
      var E = keys.Select(k => (k, best[k])).OrderByDescending(x => x.Item2).ToList();   // 안정 정렬
      var r = new Row { name = p.name, code = p.code, cat = CatOf(p.code), floor = FloorOf(p.code), batch = p.g, room = room,
        t1 = E[0].k, s1 = E[0].Item2, t2 = E.Count > 1 ? E[1].k : "", s2 = E.Count > 1 ? E[1].Item2 : -1 };
      r.gap = r.s1 - (E.Count > 1 ? E[1].Item2 : -1);
      r.e = r.t1 == p.code ? 1 : 0; r.f = FloorOf(r.t1) == FloorOf(p.code) ? 1 : 0;
      rows[ti] = r;
    });
    return rows.ToList();
  }

  // JS 의 Number.prototype.toFixed(4) 를 그대로 : double 의 '정확한 이진값'을 기준으로
  // 가장 가까운 n/10^4 를 고르고, 정확히 가운데면 큰 쪽. (decimal 로 바꾸면 15자리에서 잘려 끝자리가 달라진다)
  public static string Fix4(double x){
    string sign = "";
    if(x < 0){ sign = "-"; x = -x; }
    long bits = BitConverter.DoubleToInt64Bits(x);
    int exp = (int)((bits >> 52) & 0x7FF);
    long man = bits & 0xFFFFFFFFFFFFFL;
    if(exp == 0) exp++; else man |= 1L << 52;
    exp -= 1075;                                    // x = man × 2^exp
    var num = new System.Numerics.BigInteger(man) * 10000;
    System.Numerics.BigInteger n;
    if(exp >= 0) n = num << exp;
    else {
      var den = System.Numerics.BigInteger.One << (-exp);
      var rem = System.Numerics.BigInteger.Remainder(num, den);
      n = System.Numerics.BigInteger.Divide(num, den);
      if(rem * 2 >= den) n += 1;
    }
    string digits = n.ToString().PadLeft(5, '0');
    return sign + digits.Substring(0, digits.Length - 4) + "." + digits.Substring(digits.Length - 4);
  }
}
'@

Write-Host '[2] 사진마다 맞혀 보기 (같은 촬영 묶음은 기준에서 뺌)'
$sw = [Diagnostics.Stopwatch]::StartNew()
$rows = [Eval]::Run($q, [string[]]$names, [string[]]$codes, $batchMap, $D, $N)
Write-Host ("  {0}장 · {1:N1}초" -f $rows.Count, $sw.Elapsed.TotalSeconds)

Write-Host '[3] 발표 숫자와 대조'
$R = @($rows | Where-Object { -not $_.room })
$n = $R.Count
function Pct($a, $b){ '{0:N1}' -f (100.0 * $a / $b) }
$e = ($R | Measure-Object e -Sum).Sum; $f = ($R | Measure-Object f -Sum).Sum
$k10 = [int][Math]::Round($n * 0.1)
$byGap = @($R | Sort-Object -Property gap -Descending -Stable | Select-Object -First $k10)
$byS1  = @($R | Sort-Object -Property s1  -Descending -Stable | Select-Object -First $k10)
$checks = @(
  @('측정 사진 수',           "$n",                                             '1844'),
  @('자리 정확도',            (Pct $e $n),                                      '55.6'),
  @('층 정확도',              (Pct $f $n),                                      '66.8'),
  @('격차 상위 10% 자리',     (Pct (($byGap | Measure-Object e -Sum).Sum) $k10), '92.9'),
  @('격차 상위 10% 층',       (Pct (($byGap | Measure-Object f -Sum).Sum) $k10), '97.8'),
  @('1위 점수 상위 10% 자리', (Pct (($byS1  | Measure-Object e -Sum).Sum) $k10), '64.7')
)
$bad = 0
foreach($c in $checks){ $ok = ($c[1] -eq $c[2]); if(-not $ok){ $bad++ }; Write-Host ("  {0,-16} {1,6}  (발표 {2})  {3}" -f $c[0], $c[1], $c[2], $(if($ok){'같음'}else{'다름 ★'})) }
if($bad){ Write-Host '발표 숫자와 다릅니다 — CSV 를 쓰지 않습니다' -ForegroundColor Red; exit 1 }

Write-Host '[4] CSV 쓰기 (사진 이름·촬영 묶음 이름은 번호로)'
$bmap = @{}; $bn = 0
$sb = New-Object Text.StringBuilder
[void]$sb.Append('photo_id,floor,place_code,place_type,batch_id,top1_place,top1_sim,top2_place,top2_sim,gap,place_correct,floor_correct')
for($i = 0; $i -lt $n; $i++){
  $row = $R[$i]
  if(-not $bmap.ContainsKey($row.batch)){ $bn++; $bmap[$row.batch] = 'B' + $bn.ToString('00') }
  [void]$sb.Append("`r`n").Append((@(('P' + ($i+1).ToString('0000')), $row.floor, $row.code, $row.cat, $bmap[$row.batch], $row.t1,
    [Eval]::Fix4($row.s1), $row.t2, [Eval]::Fix4($row.s2), [Eval]::Fix4($row.gap), $row.e, $row.f) -join ','))
}
$csv = $sb.ToString()
New-Item -ItemType Directory -Force -Path (Split-Path $Out -Parent) | Out-Null
# 엑셀이 한글을 깨뜨리지 않게 BOM 을 붙인다. 지문(SHA-256)은 BOM 을 뺀 본문으로 잰다.
[IO.File]::WriteAllText($Out, $csv, (New-Object Text.UTF8Encoding($true)))
$sha = [BitConverter]::ToString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($csv))).Replace('-','').ToLower()
Write-Host ("  {0} · {1}줄 · 촬영 묶음 {2}개" -f (Split-Path $Out -Leaf), $n, $bn)
Write-Host ("  본문 SHA-256 : {0}" -f $sha)
