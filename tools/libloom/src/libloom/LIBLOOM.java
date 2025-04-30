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

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;

public class LIBLOOM {
    private int CLASS_LEVEL_M = 256;
    private int CLASS_LEVEL_K = 3;
    private int PKG_LEVEL_M = 0;
    private int PKG_LEVEL_K = 3;
    private String ABSOLUTEPATH = "";
    private ArgsParser argsParser;
    Map<String, Map<String, Map<String, String>>> classPairs = new HashMap<>(); //[DEBUG] record km match class pairs <lp, <ap, <ac, lc>>>
    public static double THRESHOLD = 0.6;   // the similarity threshold of library detection
    public static double PKG_OVERLAP_THRESHOLD = 0.8;
    private static final String STATE_PROFILES_PATH = "results/libloom/profiles/progress.txt";
    private static final String STATE_DETECTION_APKS_PATH = "results/libloom/detection/progressAPKs.txt";
    private static final String STATE_DETECTION_TPLS_PATH = "results/libloom/detection/progressTPLs.txt";
    private static final int BATCH_SIZE = 50;  // Tamaño del lote

    private int excludedLibs = 0;
    Set<String> potential_flatten_pkg_list = new HashSet<String>();
    String potential_re_pkg = "";
    double H_r, H_f;
    private static Logger logger = LoggerFactory.getLogger(LIBLOOM.class);

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

    public LIBLOOM(){
        ABSOLUTEPATH = new File("").getAbsolutePath();
        if(! loadParameters())
            logger.error("Loading parameters.properties error !!! Checking");

            logger.info(String.format(
              "PARAMETERS: CLASS_LEVEL_M=%d, PKG_LEVEL_K=%d, PKG_LEVEL_M=%d, PKG_LEVEL_K=%d, PKG_OVERLAP_THRESHOLD=%.3f, THRESHOLD=%.3f",
              CLASS_LEVEL_M, CLASS_LEVEL_K, PKG_LEVEL_M, PKG_LEVEL_K,
              PKG_OVERLAP_THRESHOLD, THRESHOLD
            ));
        
        logger.info("Ruta base de ejecución: " + ABSOLUTEPATH);
    }

    private void runDetection(LIBLOOM libloom) throws IOException, ClassHierarchyException {
        logger.info(">>> ENTRO EN runDetection");
        File fileApkDir = new File(ABSOLUTEPATH, "results/libloom/profiles/apks");  
        File[] apks = findFilesRecursively(fileApkDir, ".txt");
        if (apks != null && apks.length > 0) {
            logger.info(">>> APKS DETECTADOS:");
            for (File apk : apks) {
                logger.info("    - " + apk.getAbsolutePath());
            }
        } else {
            logger.warn(">>> No se encontraron APKs en: " + fileApkDir.getAbsolutePath());
        }

        File fileTplDir = new File(ABSOLUTEPATH, "results/libloom/profiles/tpls");
        File[] tpls = findFilesRecursively(fileTplDir, ".txt");
        if (tpls != null && tpls.length > 0) {
            logger.info(">>> TPLS DETECTADOS:");
            for (File tpl : tpls) {
                logger.info("    - " + tpl.getAbsolutePath());
            }
        } else {
            logger.warn(">>> No se encontraron TPLs en: " + fileTplDir.getAbsolutePath());
        }

        // Ordenar los archivos
        assert apks != null;
        assert tpls != null;
        Arrays.sort(apks);
        Arrays.sort(tpls);

        // Leer el progreso actual
        int progressApk = readState(STATE_DETECTION_APKS_PATH);

        // Verificar si el progreso es mayor que el número de APKs
        if (progressApk >= apks.length) {
            logger.info("El progreso de APKs (" + progressApk + ") es mayor o igual que el número total de APKs disponibles (" + apks.length + "). No hay más APKs para procesar.");
            return;
        }

        // Definir el lote de 1 APK
        int endAppIndex = Math.min(progressApk + 1, apks.length);
        File apkToProcess = apks[progressApk];
        File[] tplBatch = Arrays.copyOfRange(tpls, 0, tpls.length);  // Todas las TPLs

        // Log para mostrar el progreso de la APK actual sobre el total
        logger.info("Procesando APK " + apkToProcess.getName() + " (" + (progressApk + 1) + " de un total de " + apks.length + ") con todas las TPLs.");

        // Procesar la APK con todas las TPLs
        processDetectionBatch(apkToProcess, tplBatch, libloom, fileApkDir);

        // Guardar el progreso actual (incrementamos el índice de APK)
        saveState(STATE_DETECTION_APKS_PATH, endAppIndex);

        // Mensaje de progreso
        if (endAppIndex >= apks.length) {
            logger.info("Se ha completado el procesamiento de todas las APKs.");
        } else {
            logger.info("Se procesó la APK " + apkToProcess.getName() + ". Progreso guardado. Continuará con la siguiente APK en la siguiente ejecución.");
            System.exit(0);  // Terminar el proceso después de procesar la APK actual
        }
    }

    private void processDetectionBatch(File apk, File[] tpls, LIBLOOM libloom, File fileApkDir) throws IOException {

        logger.info(">>> ENTRO EN processDetectionBatch");
        double appStartDetectionTime = System.currentTimeMillis();
        DetectionResult dResult = new DetectionResult();

        Path profilesApksBase = Paths.get(ABSOLUTEPATH, "results", "libloom", "profiles", "apks");
        Path thisApkDir      = apk.getParentFile().toPath();
        Path relative         = profilesApksBase.relativize(thisApkDir);
        Path detectionDirPath = Paths.get(ABSOLUTEPATH, "results", "libloom", "detection")
                             .resolve(relative);

        File detectionDir = detectionDirPath.toFile();

        libloom.excludedLibs = 0;
        Map<String, BitSet> pkgBitSetApp = new LinkedHashMap<>();
        Map<String, Map<String, BloomBitSet>> bitSetApp = new LinkedHashMap<>();

        if (apk.isFile()) {
            String appName = apk.getName();
            appName = appName.substring(0, appName.length() - 4);
            dResult.setAppname(appName);

            libloom.readProfile(pkgBitSetApp, bitSetApp, apk.toString(), "app");

            if (!detectionDir.exists()) {
                logger.info("Folder " + detectionDir + " does not exist. Creating it...");
                detectionDir.mkdirs();
            }

            // Procesar todas las TPLs para la APK actual
            for (File tpl : tpls) {
                if (tpl.isFile()) {
                    double startSimilarityTime = System.currentTimeMillis();
                    Map<String, BitSet> pkgBitSetLib = new LinkedHashMap<>();
                    Map<String, Map<String, BloomBitSet>> bitSetLib = new LinkedHashMap<>();
                    libloom.readProfile(pkgBitSetLib, bitSetLib, tpl.toString(), "lib");

                    // Calcular la similitud entre <app, lib>
                    double similarity = libloom.calculateSimScore(pkgBitSetApp, pkgBitSetLib, bitSetApp, bitSetLib);
                    double similarityTime = (System.currentTimeMillis() - startSimilarityTime) / 1000;

                    if (similarity >= LIBLOOM.THRESHOLD) {
                        System.out.println(apk.getName() + "(app) : " + tpl.getName() + "(lib)");
                        System.out.println("Sim: " + similarity + "\t Time-consuming:" + similarityTime + "s");

                        // Guardar en DetectionResult
                        String library = tpl.getName();
                        library = library.substring(0, library.length() - 4);  // remove .txt
                        int idx = getLibSplitIndex(library);
                        String libname = library.substring(0, idx);
                        String version = "";
                        if (idx < library.length()) {
                            version = library.substring(idx + 1);
                        }

                        if (similarity == 1.0) {
                            updateSocialJson(appName, libname, version);
                        }

                        dResult.updateLibraries(libname, version, similarity);
                    }
                }
            }
        }

        double appDetectionTime = (System.currentTimeMillis() - appStartDetectionTime) / 1000;
        dResult.setTime(appDetectionTime);

        saveDetectionResult(dResult, detectionDir.getAbsolutePath(), apk.getName());

        logger.info("Procesamiento de " + apk.getName() + " completado en " + appDetectionTime + " segundos.");
    }

    private void updateSocialJson(String appName, String libname, String version) throws IOException {
        try {
            File socialJsonFile = new File(ABSOLUTEPATH, "results/libloom/social.json"); 
            String content = new String(Files.readAllBytes(socialJsonFile.toPath()), StandardCharsets.UTF_8);

            Gson gson = new GsonBuilder().setPrettyPrinting().create();
            Type mapType = new TypeToken<Map<String, Map<String, Object>>>() {}.getType();
            Map<String, Map<String, Object>> socialJson = gson.fromJson(content, mapType);

            if (socialJson.containsKey(appName)) {
                Map<String, Object> appObject = socialJson.get(appName);

                List<Map<String, Object>> tplsJson;
                if (appObject.containsKey("tpls")) {
                    tplsJson = (List<Map<String, Object>>) appObject.get("tpls");
                } else {
                    tplsJson = new ArrayList<>();
                }

                boolean tplExists = false;
                Map<String, Object> tplEntry = null;

                for (Map<String, Object> tplJson : tplsJson) {
                    if (tplJson.containsKey(libname)) {
                        tplEntry = tplJson;
                        tplExists = true;
                        break;
                    }
                }

                if (tplExists && tplEntry != null) {
                    Map<String, Object> tplDetails = (Map<String, Object>) tplEntry.get(libname);
                    List<String> versions = (List<String>) tplDetails.get("versions");

                    if (!versions.contains(version)) {
                        versions.add(version);
                    }
                } else {
                    Map<String, Object> tplDetails = new LinkedHashMap<>();
                    tplDetails.put("name", libname);
                    List<String> versions = new ArrayList<>();
                    versions.add(version);
                    tplDetails.put("versions", versions);

                    Map<String, Object> newTplEntry = new LinkedHashMap<>();
                    newTplEntry.put(libname, tplDetails);
                    tplsJson.add(newTplEntry);
                }

                appObject.put("tpls", tplsJson);

                Files.write(socialJsonFile.toPath(), gson.toJson(socialJson).getBytes(StandardCharsets.UTF_8));
                System.out.println("Updated social.json with tpl details for app: " + libname);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void saveDetectionResult(DetectionResult dResult, String detectionDir, String appName) throws IOException {
        logger.info("DIRECCION JSON: " + detectionDir);
        String fname = appName.substring(0, appName.length() - 4) + ".json";
        File matchResultFile = new File(detectionDir, fname);
        try (PrintWriter pWriter = new PrintWriter(matchResultFile)) {
            logger.info("Resultado de detección para " + appName + ": " + dResult.prettyJSON());
            pWriter.write(dResult.prettyJSON());
        }
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

    private void generateProfile() throws IOException, ClassHierarchyException {
        File apkDir = new File(ABSOLUTEPATH, "results/hostApks");
        logger.info("Ruta absoluta esperada de hostApks (según LIBLOOM.java): " + apkDir.getAbsolutePath());

        if (!apkDir.isDirectory()) {
            logger.info("El directorio de APKs no es válido: " + apkDir.getPath());
            return;
        }
        File[] apks = findFilesRecursively(apkDir, ".apk");
        Arrays.sort(apks);
        logger.info("APKs detectadas en hostApks: " + apks.length);

        File tplDir = new File(ABSOLUTEPATH, "../../../nfs/incibe/analisisAplicaciones/datasets/hostTpls");   
        if (!tplDir.isDirectory()) {
            logger.info("El directorio de TPLs no es válido: " + tplDir.getPath());
            return;
        }
        List<File> tplList = new ArrayList<>();
        tplList.addAll(Arrays.asList(findFilesRecursively(tplDir, ".jar")));
        tplList.addAll(Arrays.asList(findFilesRecursively(tplDir, ".aar")));
        File[] tpls = tplList.toArray(new File[0]);

        logger.info("TPLs detectadas en hostTpls: " + tpls.length);
        logger.info("APPS: " + apks.length);
        logger.info("LIBS: " + tpls.length);
        Arrays.sort(tpls);

        int lastProcessedIndex = readState(STATE_PROFILES_PATH);
        logger.info("Último índice leído del progreso: " + lastProcessedIndex);

        File apkProfileDir = new File(ABSOLUTEPATH, "results/libloom/profiles/apks");
        File tplProfileDir = new File(ABSOLUTEPATH, "results/libloom/profiles/tpls");

        processBlock(apks, tpls, apkProfileDir.getAbsolutePath(), tplProfileDir.getAbsolutePath(), lastProcessedIndex);

        System.exit(0);
    }

    private void processBlock(File[] apks, File[] tpls, String apkOutputDir, String tplOutputDir, int startIndex) throws IOException, ClassHierarchyException {
        int totalApks = apks.length;
        int totalTpls = tpls.length;
        int maxLength = Math.max(totalApks, totalTpls);

        // Si el índice de inicio es mayor que el número de APKs y el de TPLs, se termina el proceso.
        if (startIndex >= maxLength) {
            logger.info("The Profile process has been successfully completed. ");
            logger.info(totalApks + " APK profiles and " + totalTpls + " TPL profiles have been generated.");
        }
        // Si el índice de inicio es mayor que el número de APKs, solo procesa TPLs
        else if (startIndex >= totalApks && startIndex < totalTpls) {
            int endIndexTpls = Math.min(startIndex + BATCH_SIZE, totalTpls);
            logger.info("APK processing complete. Continuing with TPLs...");
            logger.info("Processing block: " + (startIndex + 1) + " to " + endIndexTpls + " TPLs");
            File[] tplBlock = Arrays.copyOfRange(tpls, startIndex, Math.min(startIndex + BATCH_SIZE, totalTpls));
            processFiles(tplBlock, "TPL", tplOutputDir);
            saveState(STATE_PROFILES_PATH, Math.min(startIndex + BATCH_SIZE, totalTpls));
        }
        // Si el índice de inicio es mayor que el número de TPLs, solo procesa APKs
        else if (startIndex >= totalTpls && startIndex < totalApks) {
            int endIndexApks = Math.min(startIndex + BATCH_SIZE, totalApks);
            logger.info("TPL processing complete. Continuing with APKs...");
            logger.info("Processing block: " + (startIndex + 1) + " to " + endIndexApks + " APKs");
            File[] apkBlock = Arrays.copyOfRange(apks, startIndex, Math.min(startIndex + BATCH_SIZE, totalApks));
            processFiles(apkBlock, "APK", apkOutputDir);
            saveState(STATE_PROFILES_PATH, Math.min(startIndex + BATCH_SIZE, totalApks));
        }
        // Si ambas listas son más largas que el índice de inicio, procesar ambos bloques
        else {
            int endIndexApks = Math.min(startIndex + BATCH_SIZE, totalApks);
            int endIndexTpls = Math.min(startIndex + BATCH_SIZE, totalTpls);

            logger.info("Processing block: " + (startIndex + 1) + " to " + endIndexApks + " APKs and " + endIndexTpls + " TPLs");

            if (startIndex < totalApks) {
                File[] apkBlock = Arrays.copyOfRange(apks, startIndex, endIndexApks);
                processFiles(apkBlock, "APK", apkOutputDir);
            }
            if (startIndex < totalTpls) {
                File[] tplBlock = Arrays.copyOfRange(tpls, startIndex, endIndexTpls);
                processFiles(tplBlock, "TPL", tplOutputDir);
            }

            saveState(STATE_PROFILES_PATH, Math.max(endIndexApks, endIndexTpls)); // Guardar el menor de ambos índices
        }
    }

    private int readState(String path) {
        File stateFile = new File(path);
        if (!stateFile.exists()) {
            return 0;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(stateFile))) {
            String line = reader.readLine();
            return Integer.parseInt(line);
        } catch (IOException | NumberFormatException e) {
            e.printStackTrace();
            return 0;
        }
    }

    private void saveState(String path, int currentIndex) {
        File stateFile = new File(path);
        File parentDir = stateFile.getParentFile();
    
        // Create parent directory if it doesn't exist
        if (parentDir != null && !parentDir.exists()) {
            logger.info("Parent directory " + parentDir.getPath() + " does not exist. Creating it.");
            if (!parentDir.mkdirs()) {
                logger.error("Failed to create parent directory: " + parentDir.getPath());
                throw new RuntimeException("Cannot create directory: " + parentDir.getPath());
            }
        }
    
        try (PrintWriter writer = new PrintWriter(new FileWriter(stateFile))) {
            writer.println(currentIndex);
            logger.debug("Saved state to " + path + ": index=" + currentIndex);
        } catch (IOException e) {
            logger.error("Failed to save state to " + path, e);
            throw new RuntimeException("Error writing to state file: " + path, e);
        }
    }

    private void processFiles(File[] files, String type, String outputDir) throws IOException, ClassHierarchyException {
        String baseInputDir = type.equals("APK")
        ? new File(ABSOLUTEPATH, "results/hostApks").getCanonicalPath()
        : new File(new File(ABSOLUTEPATH).getParentFile().getParentFile().getParent(), "nfs/incibe/analisisAplicaciones/datasets/hostTpls").getCanonicalPath();

        logger.info("ABSOLUTEPATH " + ABSOLUTEPATH);

        for (File file : files) {
            double startConstructTime = System.currentTimeMillis();
            AppOrLibInfo info = CodeInfoCollector.getInfo(file.getPath(), ABSOLUTEPATH);
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
    private boolean loadParameters(){
        try {
            InputStream in = new FileInputStream(ABSOLUTEPATH + File.separator + "config" + File.separator + "parameters.properties");
            Properties p = new Properties();
            p.load(in);
            CLASS_LEVEL_M = Integer.parseInt(p.getProperty("CLASS_LEVEL_M"));
            CLASS_LEVEL_K = Integer.parseInt(p.getProperty("CLASS_LEVEL_K"));
            PKG_LEVEL_M = Integer.parseInt(p.getProperty("PKG_LEVEL_M"));
            PKG_LEVEL_K = Integer.parseInt(p.getProperty("PKG_LEVEL_K"));
            PKG_OVERLAP_THRESHOLD = Double.parseDouble(p.getProperty("PKG_OVERLAP_THRESHOLD"));
            THRESHOLD = Double.parseDouble(p.getProperty("SIMILARITY_THRESHOLD"));
            return true;
        } catch (IOException e) {
            e.printStackTrace();
            return false;
        }
    }
}