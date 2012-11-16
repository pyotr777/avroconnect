import java.io.IOException;
import java.text.ParseException;
import java.util.HashSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/*
 * Class for saving set of a query in HOPLang or Pig Latin, column descriptions, optional query in Google Query Language.  
 */
public class RequestTemplate {
	private String pig_query;
	private String columns;
	private String google_query;
	private HashSet<String> pars;								// List of parameters used in request template
	
	static private final Pattern pig_p = Pattern.compile("pigquery\\s*=(.*)columns",Pattern.DOTALL);
	static private final Pattern column_p = Pattern.compile("columns\\s*=(.*)");
	static private final Pattern google_p = Pattern.compile("googlequery\\s*=(.*)");
	
/*
 * Extract pig query, columns and google query from string s.
 * Parameter s - contents of request template file.
 */	
	public RequestTemplate(String s) throws IOException, ParseException {		
		Matcher m = pig_p.matcher(s);
		if (m.find()) {
			this.pig_query = m.group(1);			
		} else { 
			throw new IOException("Cannot find pig request in: " + s);
		}		
		
		m = column_p.matcher(s);
		if (m.find()) {
			this.columns = m.group(1);
		} else {
			throw new IOException("Cannot find columns description in: " + s);
		}		
		
		m = google_p.matcher(s);
		if (m.find()) {
			this.google_query = m.group(1);
		}		
		pars = new HashSet<String>();
	}
	

/*
 * Add name to the list of used parameters
 */
	public boolean addParameter(String parameter_name) {
		return pars.add(parameter_name);	
	}
	
	
/*
 * Getter methods	
 */
	public String getPig() {
		return this.pig_query;
	}
	
	public String getColumns() {
		return this.columns;
	}
	
	public String getGQ() {
		return this.google_query;
	}
		
	public HashSet<String> getParameters() {
		return this.pars;
	}
}
