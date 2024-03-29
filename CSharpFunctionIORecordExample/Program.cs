
using Go;
using MethodDecorator.Fody.Interfaces;
using System.Reflection;
using System.Collections.Concurrent;
using System.Diagnostics;
using FodyDemo;


// Attribute should be "registered" by adding as module or assembly custom attribute
[module: IntersectMethodsMarkedBy(typeof(UtGenAttribute))]

namespace Go {

    public interface IInputClass1
    {
        string func1(string a);

        string func2(string a);
    }

    public class InputClass1 : IInputClass1
    {
        public string Attr11 { get; set; }
        public string Attr12 { get; set; }

        [UtGen]
        public string func1(string a)
        {
            return a + Attr11;
        }

        [UtGen]
        public string func2(string a)
        {
            return a + Attr11;
        }
    }

    public class InputClass2 : InputClass1
    {
        public string Attr21 { get; set; }
        public string Attr22 { get; set; }
    }

    [UtGen]
    public class Sample
    {
        private InputClass2 inputClass2;
        public Sample()
        {
        }

        public string Method(IInputClass1 a, IInputClass1 b)
        {
            // this function is not supportted now, it has two interface type parameters.
            var c = a.func1("hahaha") + b.func2("heiheihei");
            return "result: ++" + c;
        }
    }

    public class MethodSigTestClass
    {
        [UtGen]
        public void Method(List<int> a, Dictionary<string, string> b)
        {
            Console.WriteLine( a.Count + b.Count > 0);
        }
    }

    public static class Program
    {
        public static void Main()
        {
            /*
            Sample sample = new Sample();
            InputClass1 a = new InputClass1 { Attr11 = "Attr11", Attr12 = "Attr12" };
            InputClass2 b = new InputClass2 { Attr11 = "Attr11", Attr12 = "Attr12", Attr21 = "Attr21", Attr22 = "Attr22" };
            sample.Method(b, a);
            */
            var x = new MethodSigTestClass();
            x.Method(new List<int> { 1, 2, 3 }, new Dictionary<string, string> { { "asd", "1" }, { "2", "2" } });
        }
    }
}