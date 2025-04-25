# LIBLOOM
LIBLOOM is designed for third-party library (TPL) detection in Android apps, 
which encodes the signature of each class 
into an individual Bloom filter for fast containment queries and then performs TPL 
detection on the query results. Advanced non-structure-preserving (NSP) obfuscations 
including class repackaging and package flattening are heuristically addressed in it.

## Getting started
> **⚠️ Warning:**
>
> Hay un problema con el sistema de rutas de WSL, por lo que se recomienda lanzar Libloom directamente desde un entorno Linux.

Open IntelliJ IDEA and navigate to:
File < Open < appcollector

Afterward, go to:
File < Project Structure

In the left panel, select the "Modules" section.  
Click the "+" button in the top left corner and choose "New Module"

Navigate to the directory containing the Java code for Libloom, which is located at:
appcollector/sources/listers/libloom


The JDK to be used is **Amazon Corretto 1.8.0_422**.

After clicking "OK", the `src` folder should appear in blue in the **Sources** tab, indicating that it has been marked as "Sources Root."  
If not, you must manually mark the directory as follows:
- Navigate to the project directories.
- Go to `appcollector/sources/listers/libloom/src`
- Right-click on the `src` folder and select `Mark Directory as Sources Root`

Next, go to:
File < Project Structure < Modules < Libraries

Add all the `.jar` files located in:
appcollector/sources/listers/libloom/lib

Make sure to check the box that appears next to each file after adding them.

Then, go to:
File < Project Structure < Project

Change the SDK to **Corretto 1.8.0_422**.  
In **Language Level**, select:
8 - Lambdas, type annotations, etc.


In the **Compiler Output** section, set the output directory to:
appcollector/sources/listers/libloom/out/

Afterward, go to:
Run < Edit Configurations < Add New Configuration < Application

In the **Working directory**, set the path to:
appcollector/sources/listers/libloom


Under **Build and Run**, choose **Java 8**, and select the file where the `main` class is located (libloom).

Finally, in **Program arguments**, enter either "profile" or "detect" depending on whether you want to generate APK and 
TPL profiles or detect TPLs used by an APK based on previously generated profiles.



## How it works

LibLoom analyzes Android apps to detect third-party libraries (TPLs). This is done by running the two-stage detection system implemented in LibLoom, which first encodes the package and class signatures into Bloom filters. At the package level, LibLoom filters out unnecessary libraries to narrow down the number of candidate TPLs for further analysis.

Next, the class-level Bloom filters are employed to compute a similarity score between the app under analysis and the candidate TPLs. This score helps identify which libraries are integrated within the app, even if it has undergone obfuscation techniques such as code repackaging or flattening.

The results of the analysis are stored in logs, detailing which TPLs have been detected and their respective versions. These logs can be used to further assess the potential security risks of the integrated libraries.

For more complex cases where obfuscation makes detection challenging, LibLoom applies an entropy-based metric to accurately detect and report libraries in obfuscated apps, ensuring precise and efficient results.
