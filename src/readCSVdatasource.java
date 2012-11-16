import java.io.*;
import java.net.*;
import java.sql.Timestamp;

import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import com.google.visualization.datasource.*;
import com.google.visualization.datasource.base.*;
import com.google.visualization.datasource.datatable.*;
import com.google.visualization.datasource.query.*;
import com.google.visualization.datasource.util.*;
import com.ibm.icu.util.ULocale;

public class readCSVdatasource extends DataSourceServlet {

    public DataTable generateDataTable(Query query, HttpServletRequest request) throws DataSourceException {
    String url = request.getParameter("url");
    System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t--\tAZ\tRead datasource from "+url+"\treadCSVdatasource");
    if (StringUtils.isEmpty(url)) {
    	System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t--\tERR\tURL parameter not provided\treadCSVdatasource");
    	url=getServletContext().getRealPath("data1.csv");
      //throw new DataSourceException(ReasonType.INVALID_REQUEST, "url parameter not provided");
    }
    //System.out.println("reading file "+ url);
    Reader reader;
    try {
      reader = new BufferedReader(new InputStreamReader(new URL(url).openStream()));
    } catch (MalformedURLException e) {
    	System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t--\tERR\tURL is malformed: " + url+"\treadCSVdatasource");
    	throw new DataSourceException(ReasonType.INVALID_REQUEST, "url is malformed: " + url);
    } catch (IOException e) {
    	System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t--\tERR\tCouldn't open URL: " + url+ "  " + e.getMessage()+"\treadCSVdatasource");
    	throw new DataSourceException(ReasonType.INVALID_REQUEST, "Couldn't read from url: " + url);
    }
    DataTable dataTable = null;
    ULocale requestLocale = DataSourceHelper.getLocaleFromRequest(request);
    try {
      // Note: We assume that all the columns in the CSV file are text columns. In cases where the
      // column types are known in advance, this behavior can be overridden by passing a list of
      // ColumnDescription objects specifying the column types. See CsvDataSourceHelper.read() for
      // more details.
      dataTable = CsvDataSourceHelper.read(reader, null, true, requestLocale);
    } catch (IOException e) {
    	System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t--\tERR\tCouldn't read from URL: " + url+ "  " + e.getMessage()+"\treadCSVdatasource");
    	throw new DataSourceException(ReasonType.INVALID_REQUEST, "Couldn't read from url: " + url);
    }
    System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t--\tAZ\tRead from "+url+" FINISHED.\treadCSVdatasource");
    return dataTable;
  }


}