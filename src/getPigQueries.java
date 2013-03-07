/* This program is a part of Visualization module of HOPSA project.
 * 
 * Read preconfigured requests (sets of pig and GQL queries) from queries.txt file
 */

import java.io.*;
import javax.servlet.*;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class getAvailableFileds
 */
public class getPigQueries extends HttpServlet {
	
	private static final long serialVersionUID = 1L;

	public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		String queries = "queries.txt";
		if (request.getParameter("org")!= null && request.getParameter("org").equals("msc")) queries="queries_msc.txt";
		String q_path=getServletContext().getRealPath(queries);
		LogWriter.writeLog("-", "INF","Get queries from file: "+q_path,"getPigQueries");
		response.setContentType("text/plain");
		
		File file = new File(q_path);		 
		
		FileInputStream fileIn = new FileInputStream(file);
		InputStream in = null;
		ServletOutputStream out = response.getOutputStream();
		 
		//copy binary contect to output stream
		//System.out.println("PIGS:\n");
		try {
            in = new BufferedInputStream(fileIn);
            int ch;
            while ((ch = in.read()) !=-1) {
                out.print((char)ch);
                //System.out.print((char)ch);
            }
        }
        finally {
            if (in != null) in.close();  // very important
        }
		//System.out.println("\n---------------");
		fileIn.close();
		out.flush();
		out.close();
	}   
}