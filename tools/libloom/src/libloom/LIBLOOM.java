package libloom;

import com.ibm.wala.ipa.cha.ClassHierarchyException;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import libloom.preprocess.AppOrLibInfo;
import libloom.preprocess.ClassFeatures;
import libloom.preprocess.CodeInfoCollector;
import libloom.entity.DetectionResult;

import java.io.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;

public class LIBLOOM {
    /* ------------------------------
     *              CONSTANTES
     * ------------------------------ */
    private int CLASS_LEVEL_M = 256;
    private int CLASS_LEVEL_K = 3;
    private int PKG_LEVEL_M   = 0;
    private int PKG_LEVEL_K   = 3;
    private String ABSOLUTEPATH = "";
    private ArgsParser argsParser;
    Map<String, Map<String, Map<String, String>>> classPairs = new HashMap<>(); //[DEBUG] record km match class pairs <lp, <ap, <ac, lc>>>
    public static double THRESHOLD = 0.6;   // the similarity threshold of library detection
    public static double PKG_OVERLAP_THRESHOLD = 0.8;

    /*
     *  Rutas (se mantienen exactamente igual)
     */
    private Path HOST_APK_PATH;
    private Path HOST_TPL_PATH;
    private Path PROFILE_APK_PATH;
    private Path PROFILE_TPL_PATH;

    /* Carpeta de salida definitiva para JSON detect */
    private Path DETECT_OUTPUT_PATH;  // se lee de parameters.properties

    // Máximo de binarios (APK + TPL) a procesar por ejecución
    private static final int BATCH_SIZE = 50;  

    private int excludedLibs = 0;
    Set<String> potential_flatten_pkg_list = new HashSet<String>();
    String potential_re_pkg = "";
    double H_r, H_f;
    private static Logger logger = LoggerFactory.getLogger(LIBLOOM.class);

    /* ----------------------------------------------------------------------
     *                             MÉTODO MAIN
     * --------------------------------------------------------------------*/
    public static void main(String[] args) throws IOException, ClassHierarchyException {
        double startTime = System.currentTimeMillis();
        LIBLOOM libloom = new LIBLOOM();
        libloom.argsParser = new ArgsParser(args);

        if (libloom.argsParser.ACTION.equals("profile")) {
            logger.info("Convert apk/aar/jar to bloom filter vectors");
            logger.info("");
            libloom.generateProfile();
        } else if (libloom.argsParser.ACTION.equals("detect")) {
            logger.info("LIBLOOM detection:");
            libloom.runDetection(libloom);
        }
        double runTime = (System.currentTimeMillis() - startTime) / 1000;
        System.out.println("Total Runtime: " + runTime + "s");
    }

    /* ----------------------------------------------------------------------
     *                           CONSTRUCTOR
     * --------------------------------------------------------------------*/
    public LIBLOOM(){
        ABSOLUTEPATH = new File("").getAbsolutePath();

        HOST_APK_PATH = Paths.get(ABSOLUTEPATH).getParent().getParent().getParent().resolve("nfs/incibe/analisisAplicaciones/datasets/hostApks");
        HOST_TPL_PATH = Paths.get(ABSOLUTEPATH).getParent().getParent().getParent().resolve("nfs/incibe/analisisAplicaciones/datasets/hostTpls");
        PROFILE_APK_PATH = Paths.get(ABSOLUTEPATH).getParent().getParent().getParent().resolve("nfs/incibe/analisisAplicaciones/datasets/profiles/apks");
        PROFILE_TPL_PATH = Paths.get(ABSOLUTEPATH).getParent().getParent().getParent().resolve("nfs/incibe/analisisAplicaciones/datasets/profiles/tpls");        

        if(! loadParameters())
            logger.error("Loading parameters.properties error !!! Checking");

            logger.info(String.format(
              "PARAMETERS: CLASS_LEVEL_M=%d, PKG_LEVEL_K=%d, PKG_LEVEL_M=%d, PKG_LEVEL_K=%d, PKG_OVERLAP_THRESHOLD=%.3f, THRESHOLD=%.3f",
              CLASS_LEVEL_M, CLASS_LEVEL_K, PKG_LEVEL_M, PKG_LEVEL_K,
              PKG_OVERLAP_THRESHOLD, THRESHOLD
            ));
        
        logger.info("Ruta base de ejecución: " + ABSOLUTEPATH);
        logger.info("Ruta HOST_APK_PATH: " + HOST_APK_PATH);
        logger.info("Ruta HOST_TPL_PATH: " + HOST_TPL_PATH);
    }

    /* ----------------------------------------------------------------------
     *                           DETECTION
     * --------------------------------------------------------------------*/
    private void runDetection(LIBLOOM libloom) throws IOException, ClassHierarchyException {
        logger.info("===== runDetection =====");
        File fileApkDir = Paths.get("/home/dblancoaza/SafeMountain/API/tools/libloom/tmpSingleApkProfiles").toFile();
        File[] apks = findFilesRecursively(fileApkDir, ".txt"); // perfiles APK
        File[] tpls = findFilesRecursively(PROFILE_TPL_PATH.toFile(), ".txt"); // perfiles TPL

        if (apks == null || apks.length == 0 || tpls == null || tpls.length == 0) {
            logger.error("No hay perfiles suficientes para ejecutar la detección. Proceso cancelado.");
            return;
        }
        Arrays.sort(apks);
        Arrays.sort(tpls);

        // Procesamos SOLO el primer APK (o modificable vía ArgsParser)
        File apkToProcess = apks[0];
        logger.info("Procesando perfil APK: " + apkToProcess.getAbsolutePath());
        logger.info("Total TPLs a comparar: " + tpls.length);

        processDetectionBatch(apkToProcess, tpls, libloom);
        logger.info("===== Fin de runDetection =====");
    }

    /**
     * Detecta TPLs para un APK (perfil .txt) contra TODOS los perfiles TPL.
     * Guarda el JSON en DETECT_OUTPUT_PATH con nombre <apk>.json
     */
    private void processDetectionBatch(File apkProfile, File[] tplProfiles, LIBLOOM libloom) throws IOException {
        double appStartDetectionTime = System.currentTimeMillis();
        DetectionResult dResult      = new DetectionResult();

        // Nombre del APK sin extensión .txt
        String appName = apkProfile.getName().replaceFirst("\\.txt$", "");
        dResult.setAppname(appName);

        /* --- Cargar perfil APK --- */
        Map<String, BitSet> pkgBitSetApp                    = new LinkedHashMap<>();
        Map<String, Map<String, BloomBitSet>> bitSetApp     = new LinkedHashMap<>();
        libloom.readProfile(pkgBitSetApp, bitSetApp, apkProfile.toString(), "app");

        /* --- Directorio de salida final (NFS) --- */
        if (!Files.exists(DETECT_OUTPUT_PATH)) Files.createDirectories(DETECT_OUTPUT_PATH);

        /* --- Comparación frente a TODAS las TPLs --- */
        for (File tpl : tplProfiles) {
            if (!tpl.isFile()) continue;
            Map<String, BitSet> pkgBitSetLib                    = new LinkedHashMap<>();
            Map<String, Map<String, BloomBitSet>> bitSetLib     = new LinkedHashMap<>();
            libloom.readProfile(pkgBitSetLib, bitSetLib, tpl.toString(), "lib");

            double similarity = libloom.calculateSimScore(pkgBitSetApp, pkgBitSetLib, bitSetApp, bitSetLib);
            if (similarity == THRESHOLD) { // THRESHOLD == 1.0
                String libname = tpl.getParentFile().getName();
                String version = FilenameUtils.getBaseName(tpl.getName());
                dResult.updateLibraries(libname, version, similarity);
            }
        }

        /* --- Persistir JSON --- */
        double detectionTime = (System.currentTimeMillis() - appStartDetectionTime) / 1000d;
        dResult.setTime(detectionTime);

        Path jsonOut = DETECT_OUTPUT_PATH.resolve(appName + ".json");
        try (PrintWriter pw = new PrintWriter(jsonOut.toFile())) {
            pw.write(dResult.prettyJSON());
        }
        logger.info("JSON guardado en " + jsonOut);
    }

    /**
     * find index of seperator, which seperate lib into libname and version
     * e.g. lib=okhttp-3.1.0 or okhttp_3.1.0 or okhttp.3.1.0   index=6
     * @param library
     * @return
     */
    public static int getLibSplitIndex(String library){
        Pattern p = Pattern.compile("_\\d|-\\d|\\.\\d");
        Matcher m = p.matcher(library);
        int idx;
        if (m.find()){
            String it = m.group(0);
            idx = library.indexOf(it);
        } else {
            idx = library.length();
        }
        return idx;
    }

    /* =====================================================================
     *              1. NUEVA LÓGICA DE GENERACIÓN DE PERFILES               
     * ===================================================================*/
    /**
     * Revisión completa del flujo:
     *   • Escaneamos los árboles hostApks y hostTpls.
     *   • Filtramos los binarios que YA tienen un perfil generado.
     *   • Procesamos un máximo de BATCH_SIZE binarios por ejecución.
     *   • No necesitamos ficheros de estado porque el perfil mismo es la prueba
     *     de que el fichero fue procesado.
     */
    private void generateProfile() throws IOException, ClassHierarchyException {
        /* 1. Obtener listas completas de binarios */
        File apkDir = HOST_APK_PATH.toFile();
        File tplDir = HOST_TPL_PATH.toFile();

        if (!apkDir.isDirectory()) {
            logger.error("hostApks directory is invalid: " + apkDir.getAbsolutePath());
            return;
        }
        if (!tplDir.isDirectory()) {
            logger.error("hostTpls directory is invalid: " + tplDir.getAbsolutePath());
            return;
        }

        List<File> allApks = Arrays.asList(findFilesRecursively(apkDir, ".apk"));
        List<File> allTpls = new ArrayList<>();
        allTpls.addAll(Arrays.asList(findFilesRecursively(tplDir, ".jar")));
        allTpls.addAll(Arrays.asList(findFilesRecursively(tplDir, ".aar")));

        logger.info("APKs totales detectadas: " + allApks.size());
        logger.info("TPLs totales detectadas: " + allTpls.size());

        /* 2. Filtrar los que ya tienen perfil */
        List<File> apksPending = allApks.stream()
                .filter(f -> !profileExists(f, "APK"))
                .sorted()
                .collect(Collectors.toList());

        List<File> tplsPending = allTpls.stream()
                .filter(f -> !profileExists(f, "TPL"))
                .sorted()
                .collect(Collectors.toList());

        logger.info("APKs pendientes    : " + apksPending.size());
        logger.info("TPLs pendientes    : " + tplsPending.size());

        if (apksPending.isEmpty() && tplsPending.isEmpty()) {
            logger.info("No hay binarios pendientes de perfilar. Fin del proceso.");
            return;
        }

        /* 3. Procesar un máximo de BATCH_SIZE binarios */
        int slotsLeft = BATCH_SIZE;

        if (!apksPending.isEmpty() && slotsLeft > 0) {
            int n = Math.min(slotsLeft, apksPending.size());
            logger.info("Procesando " + n + " APK(s) este lote …");
            processFiles(apksPending.subList(0, n).toArray(new File[0]), "APK", PROFILE_APK_PATH.toFile().getAbsolutePath());
            slotsLeft -= n;
        }

        if (!tplsPending.isEmpty() && slotsLeft > 0) {
            int n = Math.min(slotsLeft, tplsPending.size());
            logger.info("Procesando " + n + " TPL(s) este lote …");
            processFiles(tplsPending.subList(0, n).toArray(new File[0]), "TPL", PROFILE_TPL_PATH.toFile().getAbsolutePath());
        }

        logger.info("—— Lote de generación de perfiles completado ——");
    }

    
    /**
     * Devuelve true si el perfil correspondiente al fichero <file> YA existe.
     * La lógica para calcular la ruta exacta replica la de processFiles(),
     * garantizando coherencia.
     */
    private boolean profileExists(File file, String type) {
        try {
            File profileFile = buildProfileFile(file, type);
            return profileFile.exists();
        } catch (IOException e) {
            logger.warn("No se pudo comprobar existencia de perfil para " + file.getName(), e);
            return false;
        }
    }

    /**
     * Calcula la ruta de perfil que se generaría para un binario dado
     * (sin crearlo). Permite reutilizar esta función tanto en processFiles()
     * como en profileExists().
     */
    private File buildProfileFile(File file, String type) throws IOException {
        String baseInputDir = type.equals("APK")
                ? HOST_APK_PATH.toFile().getCanonicalPath()
                : HOST_TPL_PATH.toFile().getCanonicalPath();

        File inputBaseDir   = new File(baseInputDir).getCanonicalFile();
        File fileParentDir  = file.getParentFile().getCanonicalFile();
        Path relativePath   = inputBaseDir.toPath().relativize(fileParentDir.toPath());

        if (relativePath.toString().startsWith(File.separator)) {
            relativePath = Paths.get(relativePath.toString().substring(1));
        }

        String newOutputDir = (type.equals("APK") ? PROFILE_APK_PATH : PROFILE_TPL_PATH).toFile().getCanonicalPath()
                           + File.separator + relativePath;

        return new File(newOutputDir, FilenameUtils.getBaseName(file.getName()) + ".txt");
    }

    private void processFiles(File[] files, String type, String outputDir) throws IOException, ClassHierarchyException {
        String baseInputDir = type.equals("APK")
        ? HOST_APK_PATH.toFile().getCanonicalPath()
        : HOST_TPL_PATH.toFile().getCanonicalPath();

        logger.info("ABSOLUTEPATH " + ABSOLUTEPATH);

        for (File file : files) {
            double startConstructTime = System.currentTimeMillis();
            AppOrLibInfo info;
            try {
                info = CodeInfoCollector.getInfo(file.getPath(), ABSOLUTEPATH);
            } catch (SecurityException | com.ibm.wala.util.debug.UnimplementedError e) {
                logger.warn("❌ Saltando archivo con error de firma o clase no soportada: " + file.getName(), e);
                continue;
            } catch (Exception e) {
                logger.error("❌ Error inesperado al procesar archivo: " + file.getName(), e);
                continue;
            }
            logger.info("H_r_pkg para " + file.getName() + ": " + info.H_r_pkg);
            logger.info("FilePath de " + file.getName() + ": " + file.getPath());


            File inputBaseDir = new File(baseInputDir).getCanonicalFile();
            File fileParentDir = file.getParentFile().getCanonicalFile();
            
            Path relativePath = inputBaseDir.toPath().relativize(fileParentDir.toPath());

            if (relativePath.toString().startsWith(File.separator)) {
                relativePath = Paths.get(relativePath.toString().substring(1));
            }

            String newOutputDir = outputDir + File.separator + relativePath;

            new File(newOutputDir).mkdirs();

            String profileFilePath = newOutputDir + File.separator + FilenameUtils.getBaseName(file.getName()) + ".txt";

            // Verificar si el archivo de perfil ya existe
            File profileFile = new File(profileFilePath);
            if (profileFile.exists()) {
                logger.info("Perfil ya existe para: " + file.getName() + ". Omitiendo.");
                continue;
            }

            writeEntropy2Profile(FilenameUtils.getBaseName(file.getName()), info, newOutputDir);

            Map<String, BitSet> pkgBFVectors = new HashMap<>();
            addPKGBFVectors(info, pkgBFVectors);
            writePKGBFVectors2Profile(FilenameUtils.getBaseName(file.getName()), pkgBFVectors, newOutputDir);

            Map<String, Map<String, BloomBitSet>> bitSetList = new HashMap<>();
            addClazzBFVectors(info, bitSetList);
            writeClazzBFVectors2Profile(FilenameUtils.getBaseName(file.getName()), bitSetList, newOutputDir);

            double constructTime = (System.currentTimeMillis() - startConstructTime) / 1000;
            logger.info("  " + file.getName() + " (" + type + ") : " + constructTime + "s");
        }
    }

    private void writeEntropy2Profile(String fileName, AppOrLibInfo info, String outputDir) throws IOException {
        File dir = new File(outputDir);
        if (!dir.exists()) {
            logger.info("Folder " + outputDir + " does not exist. Create it.");
            dir.mkdirs();
        }
        File profile = new File(dir.getPath(), fileName + ".txt");
        List<String> flattenPkgs = info.getParentWithSinglePkg().get(info.H_f_pkg);
        PrintWriter printWriter = new PrintWriter(profile.getPath());
        String result = "{";
        result += "H_r:" + info.H_r + ";";
        result += "H_r_pkg:" + info.H_r_pkg + ";";
        result += "H_f:" + info.H_f + ";";
        String flattenListStr = (flattenPkgs != null ? flattenPkgs.toString() : "[]");
        result += "H_f_pkg_list:" + flattenListStr;
        result += "}";
        printWriter.println(result);
        printWriter.close();
    }

    private void writePKGBFVectors2Profile(String fileName, Map<String, BitSet> BFVectors, String outputDir) throws IOException {
        File dir = new File(outputDir);
        if (!dir.exists()) {
            logger.info("Folder " + outputDir + " does not exist. Create it.");
            dir.mkdirs();
        }
        File profile = new File(dir.getPath(), fileName + ".txt");
        PrintWriter printWriter = new PrintWriter(new FileWriter(profile.getPath(), true));
        for (String packageName : BFVectors.keySet()) {
            printWriter.println(packageName + "&&" + BFVectors.get(packageName));
        }
        printWriter.close();
    }

    private void writeClazzBFVectors2Profile(String fileName, Map<String, Map<String, BloomBitSet>> bitSetList, String outputDir) throws IOException {
        File dir = new File(outputDir);
        if (!dir.exists()) {
            logger.info("Folder " + outputDir + " does not exist. Create it.");
            dir.mkdirs();
        }
        File profile = new File(dir.getPath(), fileName + ".txt");
        PrintWriter printWriter = new PrintWriter(new FileWriter(profile.getPath(), true));
        for (String packageName : bitSetList.keySet()) {
            for (String className : bitSetList.get(packageName).keySet()) {
                printWriter.println(packageName + "&&" + className + "&&" + bitSetList.get(packageName).get(className).bitSet + "&&" + bitSetList.get(packageName).get(className).size);
            }
        }
        printWriter.close();
    }

    private double calculateSimScore(Map<String, BitSet> apBFVector,
                                     Map<String, BitSet> lpBFVector,
                                     Map<String, Map<String, BloomBitSet>> appBFVector,
                                     Map<String, Map<String, BloomBitSet>> libBFVector){
        Map<String, String> packageLinking = new HashMap<>();
        classPairs.clear();
        Map<String, List<String>> candidatePairs = new LinkedHashMap<>();
        Map<String, Map<String, Double>> candidate = new LinkedHashMap<>();
        getCandidateLpApPairs(apBFVector, lpBFVector, candidatePairs);
        if(isExcludedLib(candidatePairs, appBFVector, libBFVector)){
            excludedLibs ++;
            return 0.0;
        }
        candidatePackageSimilar(appBFVector, libBFVector, candidatePairs, candidate);
        candidate = sortMap(candidate);

        double similarity = 0.0;
        Map<String, Double> partition = new HashMap<>();
        partition = partitioning(candidate, packageLinking);
        similarity = simLibInApp(partition, libBFVector);

        logger.info("Similarity: " + similarity);

        if(similarity < THRESHOLD){
            packageLinking.clear();
            partition.clear();
            if(H_r >= H_f){
                partition = antiRepackagePartitioning(candidate, packageLinking, appBFVector, libBFVector);
                similarity = simLibInApp(partition, libBFVector);
            } else {
                partition = antiFlattenPackagePartitioning(candidate, packageLinking, appBFVector, libBFVector);
                similarity = simLibInApp(partition, libBFVector);
            }
        }

        if(argsParser.DEBUG && similarity >= THRESHOLD){
            printClassMatchPairs(partition, packageLinking, libBFVector);
        }
        return similarity;
    }

    private double simLibInApp(Map<String, Double> partition,
                               Map<String, Map<String, BloomBitSet>> libBFVector) {
        int count = 0, total = 0;
        for (String lp : libBFVector.keySet()) {
            int childSize = libBFVector.get(lp).size();
            total += childSize;
            if (partition.containsKey(lp)) {
                count += childSize * partition.get(lp);
            }
        }
        double similarity;
        if (total == 0 || (total <= 5 && count != total)) {  // the number of class less than 5 in lib
            similarity = 0.0f;
        } else {
            similarity = count * 1.0 / total;
        }
        return similarity;
    }


    private void printClassMatchPairs(Map<String, Double> partition,
                                      Map<String, String> packageLinking,
                                      Map<String, Map<String, BloomBitSet>> libBFVector) {
        for (String lp : libBFVector.keySet()) {
            int childSize = libBFVector.get(lp).size();
            if (partition.containsKey(lp)) {
                logger.debug(packageLinking.get(lp) + "(ap) : " + lp + "(lp)(" + partition.get(lp) + ")" + " * (" + childSize + ") ");
                Map<String, String> pairs = classPairs.get(lp).get(packageLinking.get(lp));
                for(String ac : pairs.keySet()){
                    logger.debug("\t\t" + ac + "(ac) : " + pairs.get(ac) + "(lc)");
                }
            }
        }
    }

    /**
     * get Sim score between each pair <lc, ac>
     * attention：Map need to be ordered（LinkedHashMap,TreeMap）
     * @param classBitSetListApp
     * @param classBitSetListLib
     * @return Sim score between each lc_i and ac_j
     */
    private double[][] lc_ac_classSimilar(Map<String, BloomBitSet> classBitSetListApp,
                                          Map<String, BloomBitSet> classBitSetListLib,
                                          String appPkgName) {
        double[][] result = new double[classBitSetListLib.size()][classBitSetListApp.size()];
        List<String> acList = new ArrayList<>(classBitSetListApp.keySet());
        List<String> lcList = new ArrayList<>(classBitSetListLib.keySet());

        int count = 0, total = 0;
        for(int i = 0; i < lcList.size(); i++){
            total = classBitSetListLib.get(lcList.get(i)).size;  //count of lc sigs
            for(int j = 0; j < acList.size(); j++){
                count = 0;
                if(isSuperSet(classBitSetListLib.get(lcList.get(i)).bitSet, classBitSetListApp.get(acList.get(j)).bitSet)){
                    count = classBitSetListApp.get(acList.get(j)).size;
                }
                result[i][j] =  count * 1.0 / total;
                result[i][j] = (result[i][j] < 0.33 ? 0 : result[i][j]);

                if(appPkgName.equals(potential_re_pkg)){
                    int sigsInLc = classBitSetListLib.get(lcList.get(i)).size;
                    if( sigsInLc <= 5){
                        result[i][j] = (result[i][j] < 1 ? 0 : 1);
                    } else if (sigsInLc <= 10 ){
                        result[i][j] = (result[i][j] < 0.8 ? 0 : result[i][j]);
                    } else if (sigsInLc <= 25 ){
                        result[i][j] = (result[i][j] < 0.5 ? 0 : result[i][j]);
                    }
                }
            }
        }

        return result;
    }

    private void candidatePackageSimilar(Map<String, Map<String, BloomBitSet>> appBFVector,
                                          Map<String, Map<String, BloomBitSet>> libBFVector,
                                          Map<String, List<String>> candidatePairs,
                                          Map<String, Map<String, Double>> packageCandidate){
        double PACKAGE_SIMILARITY_THRESHOLD = 0.01;

        for(String lp : candidatePairs.keySet()){
            int lp_clazz_count = libBFVector.get(lp).size();
            int[] lp_sig_count = new int[lp_clazz_count];
            List<String> lcList = new ArrayList<>(libBFVector.get(lp).keySet());
            int k = 0;
            for(String lc : lcList){
                lp_sig_count[k++] = libBFVector.get(lp).get(lc).size;
            }

            for(String ap : candidatePairs.get(lp)){
                double [][] clazzSimilarity = lc_ac_classSimilar(appBFVector.get(ap), libBFVector.get(lp), ap);

                double pairSimilarity = 0.0;
                MaxMatching km = new MaxMatching(clazzSimilarity, lp_sig_count);

                if(argsParser.DEBUG){
                    //-- store matching class pairs <start>
                    List<String> acList = new ArrayList<>(appBFVector.get(ap).keySet());
                    Map<String, String> ac_lc_pairs = new HashMap<>();
                    for(k = 0; k < km.match.length; k++){
                        if(km.match[k] != -1){
                            ac_lc_pairs.put(acList.get(k), lcList.get(km.match[k]));
                        }
                    }

                    Map<String, Map<String, String>> lpValue;
                    lpValue = classPairs.get(lp);
                    if(lpValue == null){
                        lpValue = new HashMap<>();
                        classPairs.put(lp, lpValue);
                    }
                    Map<String, String> apValue;
                    apValue = classPairs.get(lp).get(ap);
                    if(apValue == null){
                        apValue = new HashMap<>();
                        classPairs.get(lp).put(ap, apValue);
                    }
                    classPairs.get(lp).put(ap, ac_lc_pairs);
                    //-- store matching class pairs <end>
                }

                if(lp_clazz_count == 0){
                    pairSimilarity = 0.0;
                } else {
                    pairSimilarity = (float) km.max_matching_pairs / (float) lp_clazz_count;
                    //pairSimilarity = km.avg_weight;
                }
                if(pairSimilarity > PACKAGE_SIMILARITY_THRESHOLD) {
                    if(! packageCandidate.containsKey(lp)){
                        Map<String, Double> pairSimScore = new HashMap<>();
                        packageCandidate.put(lp, pairSimScore);
                    }
                    packageCandidate.get(lp).put(ap, pairSimilarity);
                }
            }
        }
    }

    /**
     * @func  get candidate <lp, ap> pairs (set containment query problem)
     * @param pkgBitSetApp
     * @param pkgBitSetLib
     * @param candidatePairs
     */
    private void getCandidateLpApPairs(Map<String, BitSet> apBFVector,
                                      Map<String, BitSet> lpBFVector,
                                      Map<String, List<String>> candidatePairs) {
        for(String lp : lpBFVector.keySet()){
            for(String ap : apBFVector.keySet()){
                boolean is_wl_violated = false;
                for(String w : AppOrLibInfo.ignore_pkg_prefix){
                    if(ap.startsWith(w) && ! lp.startsWith(w)){
                        is_wl_violated = true;
                        break;
                    }
                }
                if(is_wl_violated)
                    continue;
                boolean ap_hold_condition = false;
                if((H_r>=H_f) && ap.equals(potential_re_pkg))
                    ap_hold_condition = true;
                else if(H_f>H_r && potential_flatten_pkg_list.contains(ap))
                    ap_hold_condition = true;
                else if(packageHaveSameDepth(lp, ap))
                    ap_hold_condition = true;

                if(ap_hold_condition) {
                    if (overlapRatio(lpBFVector.get(lp), apBFVector.get(ap)) >= PKG_OVERLAP_THRESHOLD) {
                        if (!candidatePairs.containsKey(lp)) {
                            List<String> aplist = new LinkedList<>();
                            candidatePairs.put(lp, aplist);
                        }
                        candidatePairs.get(lp).add(ap);
                    }
                }
            }
        }
    }

    private Map<String, Double> partitioning(Map<String, Map<String, Double>> candidate,
                                             Map<String, String> linking) {
        Map<String, Double> result = new HashMap<>();
        Map<String, String> samePkgLinking = new HashMap<>();
        Map<String, Double> samePkgPartition = new HashMap<>();
        for (String lp : candidate.keySet()) {
            Map<String, Double> candAPsAssociatedWithLP = candidate.get(lp);
            for (String ap : candAPsAssociatedWithLP.keySet()) {
                if (lp.equals(ap)) {                     //only partial packages are obfuscated, when ap==lp, put.
                    samePkgLinking.put(lp, ap);
                    samePkgPartition.put(lp, candAPsAssociatedWithLP.get(ap));
                    break;
                } else if(packageHaveSameDepth(lp,ap)){  //TODO: just compare <lp,ap> with the same depth
                    boolean flag = true;
                    for (String lp_l : linking.keySet()) {
                        String ap_l = linking.get(lp_l);
                        if (!compare(relationship(lp, lp_l), relationship(ap, ap_l))) {
                            flag = false;
                            break;
                        }
                    }
                    if (flag) {
                        linking.put(lp,ap);
                        result.put(lp, candAPsAssociatedWithLP.get(ap));
                        break;
                    }
                }
            }
        }
        linking.putAll(samePkgLinking);
        result.putAll(samePkgPartition);
        return result;
    }

    private Map<String, Double> antiRepackagePartitioning(Map<String, Map<String, Double>> candidate,
                                                          Map<String, String> linking,
                                                          Map<String, Map<String, BloomBitSet>> bitSetApp,
                                                          Map<String, Map<String, BloomBitSet>> bitSetLib) {
        Map<String, Double> result = new HashMap<>();
        for (String lp : candidate.keySet()){
            Map<String, Double> candAPsAssociatedWithLP = candidate.get(lp);
            for (String ap : candAPsAssociatedWithLP.keySet()){
                if(! linking.containsKey(lp)){
                    if(lp.equals(ap)){
                        linking.put(lp, ap);
                        result.put(lp, candAPsAssociatedWithLP.get(ap));
                        break;
                    } else if (ap.equals(potential_re_pkg)) {
                        if(result.containsKey(lp) && result.get(lp).doubleValue() > candAPsAssociatedWithLP.get(ap).doubleValue()) //partial re-package
                            continue;
                        linking.put(lp, ap);
                        result.put(lp, candAPsAssociatedWithLP.get(ap));
                        break;
                    }
                }
            }
        }
        return result;
    }

    private Map<String, Double> antiFlattenPackagePartitioning(Map<String, Map<String, Double>> candidate,
                                                               Map<String, String> linking,
                                                               Map<String, Map<String, BloomBitSet>> bitSetApp,
                                                               Map<String, Map<String, BloomBitSet>> bitSetLib) {
        Map<String, Double> result = new HashMap<>();
        HashSet<String> apAllocation = new HashSet<>();  // store ap that has been allocated
        for(String lp : candidate.keySet()){
            Map<String, Double> candAPsAssociatedWithLP = candidate.get(lp);
            for(String ap : candAPsAssociatedWithLP.keySet()){
                if(! linking.containsKey(lp)){
                    if(lp.equals(ap) || (potential_flatten_pkg_list.contains(ap) && ! apAllocation.contains(ap))){
                        linking.put(lp, ap);
                        result.put(lp, candAPsAssociatedWithLP.get(ap));
                        apAllocation.add(ap);
                        continue;
                    }
                }
            }
        }
        return result;
    }

    private boolean packageHaveSameDepth(String package1, String package2){
        String[] nameList1 = package1.split("/");
        String[] nameList2 = package2.split("/");
        if(nameList1.length == nameList2.length)
            return true;
        else
            return false;
    }

    private boolean compare(int[] relation1, int[] relation2) {
        for (int i = 0; i < relation1.length; i++) {
            if (relation1[i] != relation2[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param name1 package1
     * @param name2 package2
     * @return
     * e.g.
     *  name1 = "com.google"    name2 = "com.google.ads"
     *  result={2,0,1}    [1]:distance between name1 and same root; [2]:distance between name2 and same root
     *
     *  name1 = "a.b.c"         name2 = "a.b.c.d"
     *  result={2,1,2}
     */
    private int[] relationship(String name1, String name2) {
        String[] nameList1 = name1.split("/");
        String[] nameList2 = name2.split("/");
        int[] result = new int[3];

        int depth = 0;
        while(depth < nameList1.length && depth < nameList2.length) {
            if (nameList1[depth].equals(nameList2[depth])) {
                depth ++;
            } else {
                break;
            }
        }
        if (depth == 0) {
            result[0] = depth;
            result[1] = Integer.MAX_VALUE;
            result[2] = Integer.MAX_VALUE;
        }
        else {
            result[0] = depth;
            result[1] = nameList1.length - depth;
            result[2] = nameList2.length - depth;
        }
        return result;
    }

    /*
        create bloom filters for each package
        (pkg →  BF vector)
     */
    public void addPKGBFVectors(AppOrLibInfo info, Map<String, BitSet> BFVectors) throws IOException{
        Map<String, List<ClassFeatures>> pkgClassFeatures = info.getFeatures();
        logger.info("Nº de paquetes con características: " + pkgClassFeatures.keySet().size());
        for(String pkg : pkgClassFeatures.keySet()) {
            List<String> list = new LinkedList<>();
            for(ClassFeatures cf : pkgClassFeatures.get(pkg)) {
                //if(cf.getMethods().size() + cf.getMemtypes().size() > MAX_FEATRUES_IN_CLASS)  //ignore class that features > 50
                //    continue;
                list.add(cf.getSuperClass());
                for(String iface : cf.getInterfaces()) {
                    list.add(iface);
                }
                for(String m : cf.getMethods()) {
                    list.add(m);
                }
                for(String v : cf.getMemtypes()) {
                    list.add(v);
                }
            }
            BloomHash bloomHash = new BloomHash(PKG_LEVEL_M, PKG_LEVEL_K);
            BitSet pkgBF = new BitSet(PKG_LEVEL_M);
            for(String sig : list){
                for(int idx : bloomHash.hash(sig)){
                    pkgBF.set(idx, true);
                }
            }
            BFVectors.put(pkg, pkgBF);
        }
    }

    public void addClazzBFVectors(AppOrLibInfo info, Map<String, Map<String, BloomBitSet>> bitSetList) {
        Map<String, List<ClassFeatures>> pkgClassFeatures = info.getFeatures();
        for(String pkg : pkgClassFeatures.keySet()){
            for(ClassFeatures cf : pkgClassFeatures.get(pkg)){
                //if(cf.getMethods().size()+cf.getMemtypes().size() > MAX_FEATRUES_IN_CLASS) //ignore class that features > 50
                //    continue;
                List<String> list = new LinkedList<>();
                list.add(cf.getSuperClass());
                for(String it : cf.getInterfaces()){
                    list.add(it);
                }
                for(String m : cf.getMethods()){
                    list.add(m);
                }
                for(String v : cf.getMemtypes()){
                    list.add(v);
                }
                int sigCount = cf.getMethods().size() + cf.getMemtypes().size();

                Map<String, BloomBitSet> classBitSet = bitSetList.get(pkg);
                if(classBitSet == null){
                    classBitSet = new HashMap<>();
                    bitSetList.put(pkg, classBitSet);
                }
                BloomBitSet bitSet = classBitSet.get(cf.getClassName());
                if(bitSet == null){
                    BloomHash bloomHash = new BloomHash(CLASS_LEVEL_M, CLASS_LEVEL_K);
                    BitSet clazzBF = new BitSet(CLASS_LEVEL_M);
                    for(String sig : list){
                        for (int idx : bloomHash.hash(sig)){
                            clazzBF.set(idx, true);
                        }
                    }
                    bitSet = new BloomBitSet(clazzBF, sigCount);
                    classBitSet.put(cf.getClassName(), bitSet);
                }
            }
        }
    }

    private Map<String, Map<String, Double>> sortMap(Map<String, Map<String, Double>> candidate) {
        for (String lp : candidate.keySet()) {
            candidate.put(lp, getSortedHashtableByValue1(candidate.get(lp)));
        }
        candidate = getSortedHashtableByValue2(candidate);
        return candidate;
    }

    private static class SortMap implements Comparable<SortMap> {
        public String key;
        public Double value;

        public SortMap(String key, Double value) {
            this.key = key;
            this.value = value;
        }

        @Override
        public int compareTo(SortMap o) {
            return value < o.value ? 1 : (value.equals(o.value)) ? 0 : -1;
        }
    }

    private Map<String, Double> getSortedHashtableByValue1(Map<String, Double> h) {
        Map<String, Double> result = new LinkedHashMap<>();

        SortMap[] array = new SortMap[h.size()];
        int i = 0;
        for (String key : h.keySet()) {
            array[i] = new SortMap(key, h.get(key));
            i++;
        }
        Arrays.sort(array);

        for (i = 0; i < h.size(); i++) {
            result.put(array[i].key, array[i].value);
        }
        return result;
    }

    private Map<String, Map<String, Double>> getSortedHashtableByValue2(Map<String, Map<String, Double>> h) {
        Map<String, Map<String, Double>> result = new LinkedHashMap<>();

        SortMap[] array = new SortMap[h.size()];
        int i = 0;
        for (String key1 : h.keySet()) {
            array[i] = new SortMap(key1, (double)h.get(key1).values().toArray()[0]);
            i++;
        }
        Arrays.sort(array);
        for (i = 0; i < h.size(); i++) {
            result.put(array[i].key, h.get(array[i].key));
        }
        return result;
    }

private void readProfile(Map<String, BitSet> pkgBitSet,
                         Map<String, Map<String, BloomBitSet>> bitSetList,
                         String file,
                         String category) {
    List<String> lines = new ArrayList<>();
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
        String str;
        while ((str = reader.readLine()) != null) {
            lines.add(str.trim());
        }
    } catch (IOException e) {
        logger.error("Error leyendo el archivo de perfil: " + file, e);
        return;
    }

    for (String line : lines) {
        if (line.isEmpty()) {
            continue; // Saltar líneas vacías
        }

        if (line.startsWith("{") && line.endsWith("}")) {  // Información de entropía
            if (!category.equals("app")) {
                logger.warn("Se encontró información de entropía en un perfil no 'app': " + file);
                continue;
            }

            String[] sections = line.substring(1, line.length() - 1).split(";");
            for (String section : sections) {
                String[] sub = section.split(":");
                if (sub.length != 2) {
                    logger.warn("Sección malformada en entropía: " + section);
                    continue;
                }
                switch (sub[0]) {
                    case "H_r":
                        H_r = sub[1].isEmpty() ? 0 : Double.parseDouble(sub[1]);
                        break;
                    case "H_r_pkg":
                        potential_re_pkg = sub[1];
                        break;
                    case "H_f":
                        H_f = sub[1].isEmpty() ? 0 : Double.parseDouble(sub[1]);
                        break;
                    case "H_f_pkg_list":
                        String listStr = sub[1];
                        if (listStr.equals("null") || !listStr.startsWith("[")) {
                            break;
                        }
                        if (sub[1].startsWith("[") && sub[1].endsWith("]")) {
                            String[] pkgs = sub[1].substring(1, sub[1].length() - 1).split(", ");
                            for (String pkg : pkgs) {
                                if (!pkg.trim().isEmpty()) {
                                    potential_flatten_pkg_list.add(pkg.trim());
                                }
                            }
                        } else {
                            logger.warn("Formato incorrecto en H_f_pkg_list: " + sub[1]);
                        }
                        break;
                    default:
                        logger.warn("Clave desconocida en entropía: " + sub[0]);
                }
            }
        } else {  // BitSets de paquetes o clases
            String[] sections = line.split("&&");
            if (sections.length == 2) {  // Package-level bloom filters
                String pkgName = sections[0];
                String bits = sections[1];
                if (bits.equals("{}")) {
                    continue; // No hay bits activos
                }
                BitSet bitSet = new BitSet(PKG_LEVEL_M);
                try {
                    String[] bitIdxArray = bits.substring(1, bits.length() - 1).split(", ");
                    for (String idx : bitIdxArray) {
                        if (!idx.isEmpty()) {
                            bitSet.set(Integer.parseInt(idx));
                        }
                    }
                    pkgBitSet.put(pkgName, bitSet);
                } catch (Exception e) {
                    logger.error("Error procesando BitSet de paquete en línea: " + line, e);
                }
            } else if (sections.length == 4) {  // Class-level bloom filters
                String pkgName = sections[0];
                String className = sections[1];
                String bits = sections[2];
                String sizeStr = sections[3];

                try {
                    BitSet bitSet = new BitSet(CLASS_LEVEL_M);
                    String[] bitIdxArray = bits.substring(1, bits.length() - 1).split(", ");
                    for (String idx : bitIdxArray) {
                        if (!idx.isEmpty()) {
                            bitSet.set(Integer.parseInt(idx));
                        }
                    }
                    int size = Integer.parseInt(sizeStr);
                    bitSetList.computeIfAbsent(pkgName, k -> new LinkedHashMap<>())
                              .put(className, new BloomBitSet(bitSet, size));
                } catch (Exception e) {
                    logger.error("Error procesando BitSet de clase en línea: " + line, e);
                }
            } else {
                logger.warn("Línea malformada ignorada: " + line);
            }
        }
    }

    // Validaciones mínimas al terminar
    if (category.equals("app") && (H_r == 0 && H_f == 0)) {
        logger.error("Entropía H_r y H_f no fueron correctamente inicializadas en: " + file);
    }
    if (pkgBitSet.isEmpty()) {
        logger.warn("pkgBitSet vacío después de leer el perfil: " + file);
    }
    if (bitSetList.isEmpty()) {
        logger.warn("bitSetList vacío después de leer el perfil: " + file);
    }
}



    /**
     * whether set1 represented by bitSet1 is superset of set2 represented by bitSet2
     * @param bitSet1
     * @param bitSet2
     * @return
     */
    private boolean isSuperSet(BitSet lcBFVector, BitSet acBFVector) {
        boolean flag = false;
        BitSet tmpLcBFV = (BitSet) lcBFVector.clone();
        BitSet tmpAcBFV = (BitSet) acBFVector.clone();
        tmpLcBFV.and(tmpAcBFV);
        if (tmpLcBFV.equals(tmpAcBFV)) {
            flag = true;
        }
        return flag;
    }

    /**
     * get the jaccard similarity between lpBFVector and apBFVector
     * @param lpBFVector
     * @param apBFVector
     * @return
     */
    private double overlapRatio(BitSet lpBFVector, BitSet apBFVector){
        BitSet andResult = (BitSet) lpBFVector.clone();
        andResult.and(apBFVector);
        int andbit = andResult.cardinality();
        double similarity;
        if(lpBFVector.cardinality() > apBFVector.cardinality())
            similarity = (double) andResult.cardinality() / apBFVector.cardinality();
        else
            similarity = (double) andResult.cardinality() / lpBFVector.cardinality();
        return similarity;
    }

    /**
     * decide if a lib is excluded at pkg matching stage
     * @param candidatePairs    candidate <lp,ap> pairs at pkg matching stage
     * @param libBFVectors      the lib bloom filter vectors
     * @return
     */
    private boolean isExcludedLib(Map<String, List<String>> candidatePairs,
                                  Map<String, Map<String, BloomBitSet>> appBFVectors,
                                  Map<String, Map<String, BloomBitSet>> libBFVectors){
        int allClasses = 0, classesInCandidatePairs = 0;
        for(String lp : libBFVectors.keySet()){
            allClasses += libBFVectors.get(lp).size();
        }
        for(String lp : candidatePairs.keySet()){
            int maxClassesInAp = 0;
            for(String ap : candidatePairs.get(lp)){
                int classesInAp = appBFVectors.get(ap).size();
                maxClassesInAp = maxClassesInAp < classesInAp ? classesInAp : maxClassesInAp;
            }
            classesInCandidatePairs += maxClassesInAp;
        }
        return classesInCandidatePairs / (double)allClasses < THRESHOLD ? true : false;
    }

    private static File[] findFilesRecursively(File dir, String extension) {
        List<File> fileList = new ArrayList<>();
        for (File file : dir.listFiles()) {
            if (file.isDirectory()) {
                fileList.addAll(Arrays.asList(findFilesRecursively(file, extension)));
            } else if (file.getName().endsWith(extension)) {
                fileList.add(file);
            }
        }
        return fileList.toArray(new File[0]);
    }

    /**
     * Load parameters from configuration ("parameters.properties")
     * @return true if load success, otherwize false if fail
     */
    private boolean loadParameters() {
        try (InputStream in = new FileInputStream(ABSOLUTEPATH + File.separator + "config" + File.separator + "parameters.properties")) {
            Properties p = new Properties();
            p.load(in);
            CLASS_LEVEL_M          = Integer.parseInt(p.getProperty("CLASS_LEVEL_M"));
            CLASS_LEVEL_K          = Integer.parseInt(p.getProperty("CLASS_LEVEL_K"));
            PKG_LEVEL_M            = Integer.parseInt(p.getProperty("PKG_LEVEL_M"));
            PKG_LEVEL_K            = Integer.parseInt(p.getProperty("PKG_LEVEL_K"));
            PKG_OVERLAP_THRESHOLD  = Double.parseDouble(p.getProperty("PKG_OVERLAP_THRESHOLD"));
            THRESHOLD              = Double.parseDouble(p.getProperty("SIMILARITY_THRESHOLD"));

            String outPath = p.getProperty("DETECT_OUTPUT_FOLDER",
                    Paths.get(ABSOLUTEPATH, "results", "libloom", "detection").toString());
            DETECT_OUTPUT_PATH = Paths.get(outPath);
            return true;
        } catch (IOException e) {
            logger.error("Error cargando parameters.properties", e);
            return false;
        }
    }
}